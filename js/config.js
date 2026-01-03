/**
 * API Explorer Configuration
 * RIC별 설정 및 기본 헤더 정보
 */

const CONFIG = {
    // RIC 설정 (서버에서 로드됨)
    RIC: {},

    // RIC 설정을 가져올 엔드포인트
    ricConfigEndpoint: '/data/ric-config.json',

    // API 목록을 가져올 엔드포인트
    apiListEndpoint: '/data/api-list.json',

    // API 상세 정보를 가져올 엔드포인트 (실제 서버에서는 동적으로)
    apiDetailEndpoint: '/data/api-detail.json',

    // API Router 엔드포인트 (CORS 우회를 위한 프록시)
    apiRouterEndpoint: '/api/router',

    // 기본 선택 RIC (서버에서 로드 후 업데이트됨)
    defaultRic: 'KIC',

    // 더미 응답 모드 (true: 더미 응답 사용, false: 실제 API 호출)
    useDummyResponse: true
};

// 현재 선택된 RIC
let currentRic = CONFIG.defaultRic;

// 현재 선택된 API 정보
let currentApi = null;

// 현재 뷰 모드 (form | code)
let currentViewMode = 'form';

// 기본 헤더값 백업 (Reset 기능용) - 서버에서 로드 후 설정됨
let DEFAULT_HEADERS = {};

/**
 * RIC 설정 로드
 */
function loadRicConfig() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: CONFIG.ricConfigEndpoint,
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                // RIC 설정 적용
                CONFIG.RIC = data.rics;
                CONFIG.defaultRic = data.defaultRic || 'KIC';
                currentRic = CONFIG.defaultRic;

                // 기본 헤더값 백업
                DEFAULT_HEADERS = {};
                Object.keys(CONFIG.RIC).forEach(ricCode => {
                    DEFAULT_HEADERS[ricCode] = JSON.parse(JSON.stringify(CONFIG.RIC[ricCode].headers));
                });

                console.log('RIC 설정 로드 완료:', Object.keys(CONFIG.RIC));
                resolve(data);
            },
            error: function(xhr, status, error) {
                console.error('RIC 설정 로드 실패:', error);
                alert('RIC 설정을 불러오는데 실패했습니다.');
                resolve(null);
            }
        });
    });
}
