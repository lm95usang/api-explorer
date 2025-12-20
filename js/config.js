/**
 * API Explorer Configuration
 * RIC별 설정 및 기본 헤더 정보
 */

const CONFIG = {
    // RIC 설정
    RIC: {
        KIC: {
            name: 'KIC',
            baseUrl: 'http://localhost:8080',
            headers: {
                'x-division-code': 'KM',
                'x-country-code': 'KR',
                'x-store-id': 'SVC5013',
                'x-ric-code': 'KIC',
                'x-channel-code': 'EBP-soapUI',
                'x-hash-code': 'e47e535109dc4a069de4fa555b624417',
                'x-acess-key': '6ac50011af5d491898c7463013c7956d',
                'Content-Type': 'application/json; charset=utf-8'
            }
        },
        AIC: {
            name: 'AIC',
            baseUrl: 'http://localhost:8080',
            headers: {
                'x-division-code': 'AM',
                'x-country-code': 'US',
                'x-store-id': 'SVC5014',
                'x-ric-code': 'AIC',
                'x-channel-code': 'EBP-soapUI',
                'x-hash-code': 'a12b345678cd9e012fg3h456i789j012',
                'x-acess-key': '7bd61122bg6e502909d8574124d8067e',
                'Content-Type': 'application/json; charset=utf-8'
            }
        },
        EIC: {
            name: 'EIC',
            baseUrl: 'http://localhost:8080',
            headers: {
                'x-division-code': 'EM',
                'x-country-code': 'GB',
                'x-store-id': 'SVC5015',
                'x-ric-code': 'EIC',
                'x-channel-code': 'EBP-soapUI',
                'x-hash-code': 'b23c456789de0f123gh4i567j890k123',
                'x-acess-key': '8ce72233ch7f613010e9685235e9178f',
                'Content-Type': 'application/json; charset=utf-8'
            }
        }
    },

    // API 목록을 가져올 엔드포인트
    apiListEndpoint: '/data/api-list.json',

    // API 상세 정보를 가져올 엔드포인트 (실제 서버에서는 동적으로)
    apiDetailEndpoint: '/data/api-detail.json',

    // 기본 선택 RIC
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

// 기본 헤더값 백업 (Reset 기능용)
const DEFAULT_HEADERS = {
    KIC: JSON.parse(JSON.stringify(CONFIG.RIC.KIC.headers)),
    AIC: JSON.parse(JSON.stringify(CONFIG.RIC.AIC.headers)),
    EIC: JSON.parse(JSON.stringify(CONFIG.RIC.EIC.headers))
};
