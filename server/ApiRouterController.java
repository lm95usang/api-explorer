package com.example.apirouter.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Map;

/**
 * API Router Controller
 * CORS 우회를 위한 프록시 역할 수행
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiRouterController {

    private static final Logger log = LoggerFactory.getLogger(ApiRouterController.class);

    private final RestTemplate restTemplate;

    public ApiRouterController() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * API Router 요청 DTO
     */
    public record RouterRequest(
            String targetUrl,
            String method,
            Map<String, String> headers,
            String body
    ) {}

    /**
     * API Router 엔드포인트
     * 클라이언트로부터 받은 요청을 대상 서버로 전달하고 응답을 반환
     */
    @PostMapping("/router")
    public ResponseEntity<?> routeRequest(@RequestBody RouterRequest request) {
        log.info("API Router 요청 수신 - URL: {}, Method: {}", request.targetUrl(), request.method());

        try {
            // 요청 유효성 검증
            if (request.targetUrl() == null || request.targetUrl().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "targetUrl is required"));
            }

            if (request.method() == null || request.method().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "method is required"));
            }

            // HTTP 메서드 파싱
            HttpMethod httpMethod = HttpMethod.valueOf(request.method().toUpperCase());

            // 헤더 설정
            HttpHeaders httpHeaders = new HttpHeaders();
            if (request.headers() != null) {
                request.headers().forEach((key, value) -> {
                    // Host 헤더는 RestTemplate이 자동으로 설정하므로 제외
                    if (!"host".equalsIgnoreCase(key)) {
                        httpHeaders.add(key, value);
                    }
                });
            }

            // HTTP 요청 엔티티 생성
            HttpEntity<String> httpEntity = new HttpEntity<>(request.body(), httpHeaders);

            log.debug("대상 서버 요청 - Headers: {}, Body: {}", httpHeaders, request.body());

            // 대상 서버로 요청 전송
            ResponseEntity<String> response = restTemplate.exchange(
                    URI.create(request.targetUrl()),
                    httpMethod,
                    httpEntity,
                    String.class
            );

            log.info("대상 서버 응답 - Status: {}", response.getStatusCode());

            // 응답 헤더 설정 (CORS 관련 헤더 추가)
            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.APPLICATION_JSON);

            // 응답 반환
            return ResponseEntity
                    .status(response.getStatusCode())
                    .headers(responseHeaders)
                    .body(response.getBody());

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            // 대상 서버에서 에러 응답이 온 경우
            log.warn("대상 서버 에러 응답 - Status: {}, Body: {}", e.getStatusCode(), e.getResponseBodyAsString());

            return ResponseEntity
                    .status(e.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(e.getResponseBodyAsString());

        } catch (IllegalArgumentException e) {
            // 잘못된 HTTP 메서드 등
            log.error("잘못된 요청 파라미터: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid request: " + e.getMessage()));

        } catch (Exception e) {
            // 기타 예외
            log.error("API Router 처리 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", "Internal server error",
                            "message", e.getMessage()
                    ));
        }
    }

    /**
     * 헬스체크 엔드포인트
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
