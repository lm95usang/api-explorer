/**
 * API Explorer Main Application
 */

$(document).ready(function() {
    init();
});

/**
 * 초기화
 */
async function init() {
    // RIC 설정 먼저 로드
    await loadRicConfig();

    // RIC 탭 동적 렌더링
    renderRicTabs();

    loadApiList();
    bindEvents();
    updateHeaderInfo();
}

/**
 * RIC 탭 동적 렌더링
 */
function renderRicTabs() {
    const $ricTabs = $('.ric-tabs');
    $ricTabs.empty();

    Object.keys(CONFIG.RIC).forEach(ricCode => {
        const isActive = ricCode === currentRic ? 'active' : '';
        const $tab = $(`<button type="button" class="ric-tab ${isActive}" data-ric="${ricCode}">${ricCode}</button>`);
        $ricTabs.append($tab);
    });
}

/**
 * 이벤트 바인딩
 */
function bindEvents() {
    // API 선택 변경
    $('#apiSelect').on('change', onApiSelectChange);

    // RIC 탭 클릭
    $('.ric-tab').on('click', onRicTabClick);

    // View 토글 (Form / Code)
    $('.view-btn').on('click', onViewToggle);

    // Header Info 버튼
    $('#headerInfoBtn').on('click', showHeaderInfo);

    // Header Reset 버튼
    $('#resetHeadersBtn').on('click', resetHeaders);

    // 헤더 입력 값 변경 시 실시간 반영
    $(document).on('input', '.header-info-input', onHeaderInputChange);

    // Run 버튼
    $('#runBtn').on('click', executeApi);

    // Copy 버튼
    $('#copyRequestBtn').on('click', copyRequest);

    // 코드 에디터 입력 시 라인 번호 업데이트 및 curl 명령어 업데이트
    $('#codeEditor').on('input', onCodeEditorChange);
    $('#codeEditor').on('scroll', syncLineNumbersScroll);

    // 폼 입력 변경 시 코드 에디터 및 curl 명령어 업데이트
    $(document).on('input', '#parameterForm .param-input', onFormInputChange);
    $(document).on('input', '.array-input', onFormInputChange);

    // Path/Query 파라미터 변경 시 curl 명령어 업데이트
    $(document).on('input', '#pathParameterForm .param-input', updateCurlCommand);
    $(document).on('input', '#queryParameterForm .param-input', updateCurlCommand);

    // 배열 아이템 추가/삭제 버튼
    $(document).on('click', '.btn-add-array-item', function() {
        const arrayName = $(this).attr('data-array-name');
        addArrayItem(arrayName);
    });

    $(document).on('click', '.btn-delete-array-item', function() {
        const arrayName = $(this).attr('data-array-name');
        const index = parseInt($(this).attr('data-item-index'));
        deleteArrayItem(arrayName, index);
    });

    // 파라미터 정보 버튼 호버
    $(document).on('mouseenter', '.param-info-btn', showParamTooltip);
    $(document).on('mouseleave', '.param-info-btn', hideParamTooltip);
}

/**
 * API 목록 로드
 */
function loadApiList() {
    $.ajax({
        url: CONFIG.apiListEndpoint,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            renderApiSelect(data.apis);
        },
        error: function(xhr, status, error) {
            console.error('API 목록 로드 실패:', error);
            // 데모용 하드코딩 데이터 사용
            renderApiSelect(getDemoApiList());
        }
    });
}

/**
 * 데모용 API 목록
 */
function getDemoApiList() {
    return [
        { id: 'EBP_API_104', name: '회원 탈퇴', category: '토큰결제' },
        { id: 'EBP_API_201', name: '결제 승인', category: '토큰결제' },
        { id: 'EBP_API_202', name: '결제 취소', category: '토큰결제' },
        { id: 'EBP_API_203', name: '결제 조회', category: '토큰결제' },
        { id: 'EBP_API_230', name: '토큰 발급', category: '토큰결제' },
        { id: 'EBP_API_301', name: '정기결제 등록', category: '정기결제' },
        { id: 'EBP_API_302', name: '정기결제 해지', category: '정기결제' },
        { id: 'EBP_API_401', name: '복합 결제 요청', category: '복합결제' }
    ];
}

/**
 * API 셀렉트박스 렌더링
 */
function renderApiSelect(apis) {
    const $select = $('#apiSelect');
    $select.empty();
    $select.append('<option value="">API를 선택하세요</option>');

    // 카테고리별로 그룹핑
    const grouped = {};
    apis.forEach(api => {
        const category = api.category || '기타';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(api);
    });

    // 옵션 그룹으로 추가
    Object.keys(grouped).forEach(category => {
        const $optgroup = $('<optgroup>').attr('label', category);
        grouped[category].forEach(api => {
            $optgroup.append(
                $('<option>')
                    .val(api.id)
                    .text(`${api.name} (${api.id})`)
                    .data('api', api)
            );
        });
        $select.append($optgroup);
    });
}

/**
 * API 선택 변경 핸들러
 */
function onApiSelectChange() {
    const apiId = $(this).val();

    if (!apiId) {
        $('#apiDetailSection').hide();
        currentApi = null;
        // placeholder 복원
        $('#curlCommand').html('<span class="placeholder-text">API를 선택하면 요청 정보가 표시됩니다.</span>');
        $('#responseContent').html('<span class="placeholder-text">RUN 버튼을 클릭하면 응답 결과가 표시됩니다.</span>');
        $('#requestMethod').text('').removeClass('get post put delete patch');
        $('#requestPath').text('');
        $('#responseStatus').text('').removeClass('success error');
        $('#runBtn').prop('disabled', true);
        return;
    }

    loadApiDetail(apiId);
}

/**
 * API 상세 정보 로드
 */
function loadApiDetail(apiId) {
    showLoading();

    // 실제 서버에서는 apiId를 파라미터로 전달하여 상세 정보를 가져옴
    $.ajax({
        url: CONFIG.apiDetailEndpoint,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            hideLoading();
            // JSON 파일에서 해당 API ID의 데이터 추출
            const apiData = data[apiId];
            if (apiData) {
                currentApi = apiData;
                renderApiDetail(apiData);
            } else {
                // 데이터가 없으면 데모 데이터 사용
                const demoData = getDemoApiDetail(apiId);
                currentApi = demoData;
                renderApiDetail(demoData);
            }
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('API 상세 정보 로드 실패:', error);
            // 데모용 하드코딩 데이터 사용
            const demoData = getDemoApiDetail(apiId);
            currentApi = demoData;
            renderApiDetail(demoData);
        }
    });
}

/**
 * 데모용 API 상세 정보
 */
function getDemoApiDetail(apiId) {
    const apiDetails = {
        'EBP_API_104': {
            id: 'EBP_API_104',
            name: '회원 탈퇴',
            description: '빌링 계정 사용자의 회원탈퇴',
            method: 'POST',
            path: '/ebp/v2/account/withdrawal',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'billing',
                    type: 'object',
                    required: false,
                    description: '빌링 정보 객체',
                    children: [
                        {
                            name: 'userNo',
                            type: 'String',
                            required: true,
                            description: '사용자 번호',
                            maxLength: 50,
                            defaultValue: 'API_EXPLORER_TEST_USER'
                        }
                    ]
                }
            ]
        },
        'EBP_API_201': {
            id: 'EBP_API_201',
            name: '결제 승인',
            description: '결제 승인 요청을 처리합니다.',
            method: 'POST',
            path: '/ebp/v2/payment/approve',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'payment',
                    type: 'object',
                    required: false,
                    description: '결제 정보 객체',
                    children: [
                        {
                            name: 'orderId',
                            type: 'String',
                            required: true,
                            description: '주문 번호',
                            maxLength: 100,
                            defaultValue: 'ORDER_20231220_001'
                        },
                        {
                            name: 'amount',
                            type: 'Number',
                            required: true,
                            description: '결제 금액',
                            defaultValue: '10000'
                        },
                        {
                            name: 'paymentMethod',
                            type: 'String',
                            required: true,
                            description: '결제 수단',
                            enum: ['CARD', 'BANK', 'PHONE'],
                            defaultValue: 'CARD'
                        }
                    ]
                },
                {
                    name: 'customer',
                    type: 'object',
                    required: false,
                    description: '고객 정보 객체',
                    children: [
                        {
                            name: 'customerId',
                            type: 'String',
                            required: true,
                            description: '고객 ID',
                            maxLength: 50,
                            defaultValue: 'CUST_001'
                        },
                        {
                            name: 'customerName',
                            type: 'String',
                            required: false,
                            description: '고객명',
                            maxLength: 100,
                            defaultValue: '홍길동'
                        }
                    ]
                }
            ]
        },
        'EBP_API_202': {
            id: 'EBP_API_202',
            name: '결제 취소',
            description: '승인된 결제를 취소합니다.',
            method: 'POST',
            path: '/ebp/v2/payment/cancel',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'cancel',
                    type: 'object',
                    required: false,
                    description: '취소 정보 객체',
                    children: [
                        {
                            name: 'transactionId',
                            type: 'String',
                            required: true,
                            description: '거래 번호',
                            maxLength: 100,
                            defaultValue: 'TXN_20231220_001'
                        },
                        {
                            name: 'cancelAmount',
                            type: 'Number',
                            required: true,
                            description: '취소 금액',
                            defaultValue: '10000'
                        },
                        {
                            name: 'cancelReason',
                            type: 'String',
                            required: false,
                            description: '취소 사유',
                            maxLength: 500,
                            defaultValue: '고객 요청'
                        }
                    ]
                }
            ]
        },
        'EBP_API_203': {
            id: 'EBP_API_203',
            name: '결제 조회',
            description: '결제 내역을 조회합니다.',
            method: 'GET',
            path: '/ebp/v2/payment/{transactionId}',
            pathParameters: [
                {
                    name: 'transactionId',
                    type: 'String',
                    required: true,
                    description: '거래 번호',
                    defaultValue: 'TXN_20231220_001'
                }
            ],
            queryParameters: [
                {
                    name: 'includeDetails',
                    type: 'Boolean',
                    required: false,
                    description: '상세 정보 포함 여부',
                    defaultValue: 'true'
                },
                {
                    name: 'format',
                    type: 'String',
                    required: false,
                    description: '응답 형식 (json, xml)',
                    defaultValue: 'json'
                }
            ],
            bodyParameters: []
        },
        'EBP_API_230': {
            id: 'EBP_API_230',
            name: '토큰 발급',
            description: '결제용 토큰을 발급합니다.',
            method: 'POST',
            path: '/ebp/v2/token/issue',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'token',
                    type: 'object',
                    required: false,
                    description: '토큰 발급 정보',
                    children: [
                        {
                            name: 'cardNumber',
                            type: 'String',
                            required: true,
                            description: '카드 번호',
                            maxLength: 16,
                            defaultValue: '4111111111111111'
                        },
                        {
                            name: 'expiryDate',
                            type: 'String',
                            required: true,
                            description: '만료일 (MMYY)',
                            maxLength: 4,
                            defaultValue: '1225'
                        },
                        {
                            name: 'cvv',
                            type: 'String',
                            required: true,
                            description: 'CVV',
                            maxLength: 3,
                            defaultValue: '123'
                        }
                    ]
                }
            ]
        },
        'EBP_API_301': {
            id: 'EBP_API_301',
            name: '정기결제 등록',
            description: '정기결제를 등록합니다.',
            method: 'POST',
            path: '/ebp/v2/subscription/register',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'subscription',
                    type: 'object',
                    required: false,
                    description: '정기결제 정보',
                    children: [
                        {
                            name: 'planId',
                            type: 'String',
                            required: true,
                            description: '플랜 ID',
                            maxLength: 50,
                            defaultValue: 'PLAN_MONTHLY_001'
                        },
                        {
                            name: 'customerId',
                            type: 'String',
                            required: true,
                            description: '고객 ID',
                            maxLength: 50,
                            defaultValue: 'CUST_001'
                        },
                        {
                            name: 'billingCycle',
                            type: 'String',
                            required: true,
                            description: '결제 주기',
                            enum: ['MONTHLY', 'YEARLY'],
                            defaultValue: 'MONTHLY'
                        }
                    ]
                }
            ]
        },
        'EBP_API_302': {
            id: 'EBP_API_302',
            name: '정기결제 해지',
            description: '정기결제를 해지합니다.',
            method: 'POST',
            path: '/ebp/v2/subscription/cancel',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'subscription',
                    type: 'object',
                    required: false,
                    description: '정기결제 해지 정보',
                    children: [
                        {
                            name: 'subscriptionId',
                            type: 'String',
                            required: true,
                            description: '정기결제 ID',
                            maxLength: 50,
                            defaultValue: 'SUB_001'
                        },
                        {
                            name: 'cancelReason',
                            type: 'String',
                            required: false,
                            description: '해지 사유',
                            maxLength: 500,
                            defaultValue: '고객 요청'
                        }
                    ]
                }
            ]
        },
        'EBP_API_401': {
            id: 'EBP_API_401',
            name: '복합 결제 요청',
            description: '여러 상품을 한 번에 결제하는 복합 결제 요청입니다.',
            method: 'POST',
            path: '/ebp/v2/payment/complex',
            pathParameters: [],
            queryParameters: [],
            bodyParameters: [
                {
                    name: 'order',
                    type: 'object',
                    required: true,
                    description: '주문 정보',
                    children: [
                        {
                            name: 'orderId',
                            type: 'String',
                            required: true,
                            description: '주문 번호',
                            maxLength: 100,
                            defaultValue: 'ORDER_COMPLEX_001'
                        },
                        {
                            name: 'orderName',
                            type: 'String',
                            required: true,
                            description: '주문명',
                            maxLength: 200,
                            defaultValue: '복합 상품 주문'
                        }
                    ]
                },
                {
                    name: 'items',
                    type: 'array',
                    required: true,
                    description: '결제 상품 목록 (객체 배열)',
                    itemType: 'object',
                    children: [
                        { name: 'productId', type: 'String', required: true, description: '상품 ID' },
                        { name: 'productName', type: 'String', required: true, description: '상품명' },
                        { name: 'quantity', type: 'Number', required: true, description: '수량' },
                        { name: 'unitPrice', type: 'Number', required: true, description: '단가' },
                        { name: 'discountAmount', type: 'Number', required: false, description: '할인 금액' }
                    ],
                    defaultValue: [
                        { productId: 'PROD_001', productName: '프리미엄 멤버십', quantity: 1, unitPrice: 29000, discountAmount: 0 },
                        { productId: 'PROD_002', productName: '추가 저장공간 100GB', quantity: 2, unitPrice: 5000, discountAmount: 1000 }
                    ]
                },
                {
                    name: 'payment',
                    type: 'object',
                    required: true,
                    description: '결제 정보',
                    children: [
                        {
                            name: 'method',
                            type: 'String',
                            required: true,
                            description: '결제 수단',
                            enum: ['CARD', 'BANK', 'PHONE', 'POINT'],
                            defaultValue: 'CARD'
                        },
                        {
                            name: 'totalAmount',
                            type: 'Number',
                            required: true,
                            description: '총 결제 금액',
                            defaultValue: '38000'
                        }
                    ]
                },
                {
                    name: 'customer',
                    type: 'object',
                    required: false,
                    description: '고객 정보',
                    children: [
                        {
                            name: 'customerId',
                            type: 'String',
                            required: true,
                            description: '고객 ID',
                            maxLength: 50,
                            defaultValue: 'CUST_001'
                        },
                        {
                            name: 'customerName',
                            type: 'String',
                            required: false,
                            description: '고객명',
                            maxLength: 100,
                            defaultValue: '홍길동'
                        },
                        {
                            name: 'email',
                            type: 'String',
                            required: false,
                            description: '이메일',
                            maxLength: 200,
                            defaultValue: 'hong@example.com'
                        }
                    ]
                }
            ]
        }
    };

    return apiDetails[apiId] || apiDetails['EBP_API_104'];
}

/**
 * API 상세 정보 렌더링
 */
function renderApiDetail(api) {
    // 제목 및 설명
    $('#apiTitle').text(`${api.name} (${api.id})`);
    $('#apiDescription').text(api.description);

    // 메서드 및 경로
    const $methodBadge = $('#apiMethod');
    $methodBadge.text(api.method);
    $methodBadge.removeClass('get post put delete patch');
    $methodBadge.addClass(api.method.toLowerCase());

    $('#apiPath').text(api.path);

    // 파라미터 폼 렌더링
    renderParameterForm(api);

    // 코드 에디터 업데이트
    updateCodeEditor();

    // Request 섹션 렌더링
    renderRequestSection(api);

    // 섹션 표시
    $('#apiDetailSection').show();

    // RUN 버튼 활성화
    $('#runBtn').prop('disabled', false);

    // 응답 섹션 placeholder 초기화
    $('#responseContent').html('<span class="placeholder-text">RUN 버튼을 클릭하면 응답 결과가 표시됩니다.</span>');
    $('#responseStatus').text('').removeClass('success error');
}

/**
 * 파라미터 폼 렌더링
 */
function renderParameterForm(api) {
    // Path Parameters
    const $pathForm = $('#pathParameterForm');
    $pathForm.empty();
    if (api.pathParameters && api.pathParameters.length > 0) {
        api.pathParameters.forEach(param => {
            $pathForm.append(createParameterInput(param, 'path'));
        });
        $('#pathParametersSection').show();
    } else {
        $('#pathParametersSection').hide();
    }

    // Query Parameters
    const $queryForm = $('#queryParameterForm');
    $queryForm.empty();
    if (api.queryParameters && api.queryParameters.length > 0) {
        api.queryParameters.forEach(param => {
            $queryForm.append(createParameterInput(param, 'query'));
        });
        $('#queryParametersSection').show();
    } else {
        $('#queryParametersSection').hide();
    }

    // Body Parameters
    const $bodyForm = $('#parameterForm');
    $bodyForm.empty();
    if (api.bodyParameters && api.bodyParameters.length > 0) {
        api.bodyParameters.forEach(param => {
            if (param.type === 'object' && param.children) {
                // 중첩 객체 처리 - wrapper 객체로 감싸서 렌더링
                const $group = $('<div class="param-group">');
                const $nested = $('<div class="nested-params">');

                // 객체 라벨
                const $labelWrapper = $('<div class="param-label-wrapper">');
                if (param.required) {
                    $labelWrapper.append('<span class="param-required">*</span>');
                }
                $labelWrapper.append(`<span class="param-label">${param.name}</span>`);
                $labelWrapper.append(`<span class="param-type">Object</span>`);

                // description 표시
                if (param.description) {
                    $labelWrapper.append(`<span class="param-description">${param.description}</span>`);
                }

                $nested.append($labelWrapper);

                // children 렌더링
                const $childrenContainer = $('<div class="object-children-container">')
                    .attr('data-object-name', param.name);
                param.children.forEach(child => {
                    $childrenContainer.append(createParameterInput(child, param.name));
                });
                $nested.append($childrenContainer);
                $group.append($nested);
                $bodyForm.append($group);
            } else if (param.type === 'array' && param.children) {
                // 객체 배열 처리
                const $group = $('<div class="param-group">');
                const $nested = $('<div class="nested-params array-params">');

                // 배열 라벨
                const $labelWrapper = $('<div class="param-label-wrapper">');
                if (param.required) {
                    $labelWrapper.append('<span class="param-required">*</span>');
                }
                $labelWrapper.append(`<span class="param-label">${param.name}</span>`);
                $labelWrapper.append(`<span class="param-type">Array&lt;Object&gt;</span>`);

                // description 표시
                if (param.description) {
                    $labelWrapper.append(`<span class="param-description">${param.description}</span>`);
                }

                $nested.append($labelWrapper);

                // 배열 아이템 컨테이너
                const $arrayItemsContainer = $('<div class="array-items-container">')
                    .attr('data-array-name', param.name);

                // 기본값이 있으면 해당 개수만큼, 없으면 1개의 아이템 생성
                const defaultItems = param.defaultValue || [{}];
                defaultItems.forEach((itemData, index) => {
                    const $arrayItem = createArrayItemForm(param, index, itemData);
                    $arrayItemsContainer.append($arrayItem);
                });

                $nested.append($arrayItemsContainer);

                // 아이템 추가 버튼
                const $addBtn = $('<button type="button" class="btn-add-array-item">')
                    .html('<i class="bi bi-plus-circle"></i> 아이템 추가')
                    .attr('data-array-name', param.name)
                    .data('paramSchema', param);

                $nested.append($addBtn);

                $group.append($nested);
                $bodyForm.append($group);
            } else {
                $bodyForm.append(createParameterInput(param, 'body'));
            }
        });
        $('#bodyParametersSection').show();
    } else {
        $('#bodyParametersSection').hide();
    }
}

/**
 * 파라미터 입력 필드 생성
 */
function createParameterInput(param, parentName) {
    const $group = $('<div class="param-group">');

    // 라벨 영역
    const $labelWrapper = $('<div class="param-label-wrapper">');

    if (param.required) {
        $labelWrapper.append('<span class="param-required">*</span>');
    }

    $labelWrapper.append(`<span class="param-label">${param.name}</span>`);
    $labelWrapper.append(`<span class="param-type">${param.type}</span>`);

    if (param.maxLength) {
        $labelWrapper.append(`<span class="param-constraint">max: ${param.maxLength}</span>`);
    }

    // enum 허용값 표시
    if (param.enum && param.enum.length > 0) {
        const enumText = formatEnumDisplay(param.enum);
        $labelWrapper.append(`<span class="param-enum">${enumText}</span>`);
    }

    $group.append($labelWrapper);

    // 입력 필드 영역
    const $inputWrapper = $('<div class="param-input-wrapper">');

    const $input = $('<input type="text" class="param-input">')
        .attr('name', param.name)
        .attr('data-parent', parentName)
        .attr('data-type', param.type)
        .attr('data-required', param.required || false)
        .attr('placeholder', param.description || '')
        .val(param.defaultValue || '');

    // 파라미터 정보 저장
    $input.data('paramInfo', param);

    $inputWrapper.append($input);

    // 정보 버튼
    const $infoBtn = $('<button type="button" class="param-info-btn">')
        .html('<i class="bi bi-question-circle"></i>')
        .data('paramInfo', param);

    $inputWrapper.append($infoBtn);

    $group.append($inputWrapper);

    return $group;
}

/**
 * 배열 아이템 폼 생성
 */
function createArrayItemForm(param, index, itemData) {
    const $item = $('<div class="array-item">')
        .attr('data-array-name', param.name)
        .attr('data-item-index', index);

    // 아이템 헤더
    const $itemHeader = $('<div class="array-item-header">');
    $itemHeader.append(`<span class="array-item-index">[${index}]</span>`);

    // 삭제 버튼
    const $deleteBtn = $('<button type="button" class="btn-delete-array-item">')
        .html('<i class="bi bi-trash"></i>')
        .attr('data-array-name', param.name)
        .attr('data-item-index', index);

    $itemHeader.append($deleteBtn);
    $item.append($itemHeader);

    // 아이템 필드들
    const $itemFields = $('<div class="array-item-fields">');

    param.children.forEach(child => {
        const $fieldGroup = $('<div class="array-item-field">');

        // 라벨
        const $labelWrapper = $('<div class="param-label-wrapper">');
        if (child.required) {
            $labelWrapper.append('<span class="param-required">*</span>');
        }
        $labelWrapper.append(`<span class="param-label">${child.name}</span>`);
        $labelWrapper.append(`<span class="param-type">${child.type}</span>`);
        if (child.maxLength) {
            $labelWrapper.append(`<span class="param-constraint">max: ${child.maxLength}</span>`);
        }
        // enum 허용값 표시
        if (child.enum && child.enum.length > 0) {
            const enumText = formatEnumDisplay(child.enum);
            $labelWrapper.append(`<span class="param-enum">${enumText}</span>`);
        }
        $fieldGroup.append($labelWrapper);

        // 입력 필드
        const $inputWrapper = $('<div class="param-input-wrapper">');
        const defaultVal = itemData && itemData[child.name] !== undefined ?
            itemData[child.name] : (child.defaultValue || '');

        const $input = $('<input type="text" class="param-input array-item-input">')
            .attr('name', child.name)
            .attr('data-array-name', param.name)
            .attr('data-item-index', index)
            .attr('data-type', child.type)
            .attr('data-required', child.required || false)
            .attr('placeholder', child.description || '')
            .val(defaultVal);

        $input.data('paramInfo', child);
        $inputWrapper.append($input);

        // 정보 버튼
        const $infoBtn = $('<button type="button" class="param-info-btn">')
            .html('<i class="bi bi-question-circle"></i>')
            .data('paramInfo', child);
        $inputWrapper.append($infoBtn);

        $fieldGroup.append($inputWrapper);
        $itemFields.append($fieldGroup);
    });

    $item.append($itemFields);
    return $item;
}

/**
 * 배열 아이템 추가
 */
function addArrayItem(arrayName) {
    const $container = $(`.array-items-container[data-array-name="${arrayName}"]`);
    const $addBtn = $(`.btn-add-array-item[data-array-name="${arrayName}"]`);
    const param = $addBtn.data('paramSchema');

    if (!param) return;

    const newIndex = $container.find('.array-item').length;
    const $newItem = createArrayItemForm(param, newIndex, {});
    $container.append($newItem);

    // 인덱스 재정렬
    reindexArrayItems(arrayName);

    // 업데이트
    onFormInputChange();
}

/**
 * 배열 아이템 삭제
 */
function deleteArrayItem(arrayName, index) {
    const $container = $(`.array-items-container[data-array-name="${arrayName}"]`);
    const $items = $container.find('.array-item');

    // 최소 1개는 유지
    if ($items.length <= 1) {
        alert('최소 1개의 아이템이 필요합니다.');
        return;
    }

    $items.eq(index).remove();

    // 인덱스 재정렬
    reindexArrayItems(arrayName);

    // 업데이트
    onFormInputChange();
}

/**
 * 배열 아이템 인덱스 재정렬
 */
function reindexArrayItems(arrayName) {
    const $container = $(`.array-items-container[data-array-name="${arrayName}"]`);
    $container.find('.array-item').each(function(newIndex) {
        const $item = $(this);
        $item.attr('data-item-index', newIndex);
        $item.find('.array-item-index').text(`[${newIndex}]`);
        $item.find('.btn-delete-array-item').attr('data-item-index', newIndex);
        $item.find('.array-item-input').attr('data-item-index', newIndex);
    });
}

/**
 * 폼 입력 변경 핸들러
 */
function onFormInputChange() {
    if (currentViewMode === 'form') {
        updateCodeEditor();
        updateCurlCommand();
    }
}

/**
 * 코드 에디터 변경 핸들러
 */
function onCodeEditorChange() {
    updateLineNumbers();
    if (currentViewMode === 'code') {
        updateCurlCommand();
    }
}

/**
 * 코드 에디터 업데이트
 */
function updateCodeEditor() {
    const jsonData = buildRequestBodyFromForm();
    const formattedJson = JSON.stringify(jsonData, null, 2);
    $('#codeEditor').val(formattedJson);
    updateLineNumbers();
}

/**
 * 폼에서 요청 바디 구성
 */
function buildRequestBodyFromForm() {
    const result = {};

    // 객체 컨테이너 처리
    $('.object-children-container').each(function() {
        const $container = $(this);
        const objectName = $container.attr('data-object-name');
        const objectData = {};

        $container.find('.param-input:not(.array-item-input)').each(function() {
            const $input = $(this);
            const name = $input.attr('name');
            const type = $input.attr('data-type');
            let value = $input.val();

            // 빈 값 처리
            if (value === '') return;

            // 타입 변환
            if (type === 'Number') {
                value = Number(value);
            } else if (type === 'Boolean') {
                value = value.toLowerCase() === 'true';
            }

            objectData[name] = value;
        });

        // 객체에 데이터가 있으면 결과에 추가
        if (Object.keys(objectData).length > 0) {
            result[objectName] = objectData;
        }
    });

    // 배열 아이템 폼 처리
    $('.array-items-container').each(function() {
        const $container = $(this);
        const arrayName = $container.attr('data-array-name');
        const arrayItems = [];

        $container.find('.array-item').each(function() {
            const $item = $(this);
            const itemObj = {};

            $item.find('.array-item-input').each(function() {
                const $input = $(this);
                const fieldName = $input.attr('name');
                const fieldType = $input.attr('data-type');
                let value = $input.val();

                // 빈 값 처리
                if (value === '') return;

                // 타입 변환
                if (fieldType === 'Number') {
                    value = Number(value);
                } else if (fieldType === 'Boolean') {
                    value = value.toLowerCase() === 'true';
                }

                itemObj[fieldName] = value;
            });

            // 빈 객체가 아닌 경우에만 추가
            if (Object.keys(itemObj).length > 0) {
                arrayItems.push(itemObj);
            }
        });

        if (arrayItems.length > 0) {
            result[arrayName] = arrayItems;
        }
    });

    // 구버전 배열 textarea 입력 필드 처리 (호환성)
    $('#parameterForm .array-input').each(function() {
        const $textarea = $(this);
        const name = $textarea.attr('name');
        let value = $textarea.val();

        // 이미 폼으로 처리된 배열은 건너뜀
        if (result[name]) return;

        // 빈 값 처리
        if (value === '' || value === '[]') return;

        try {
            const arrayValue = JSON.parse(value);
            if (Array.isArray(arrayValue)) {
                result[name] = arrayValue;
            }
        } catch (e) {
            console.error('배열 JSON 파싱 오류:', e);
        }
    });

    return result;
}

/**
 * Path 파라미터 가져오기
 */
function getPathParameters() {
    const params = {};

    $('#pathParameterForm .param-input[data-parent="path"]').each(function() {
        const $input = $(this);
        const name = $input.attr('name');
        const value = $input.val();

        if (value) {
            params[name] = value;
        }
    });

    return params;
}

/**
 * Query 파라미터 가져오기
 */
function getQueryParameters() {
    const params = {};

    $('#queryParameterForm .param-input[data-parent="query"]').each(function() {
        const $input = $(this);
        const name = $input.attr('name');
        const value = $input.val();

        if (value) {
            params[name] = value;
        }
    });

    return params;
}

/**
 * 라인 번호 업데이트
 */
function updateLineNumbers() {
    const $editor = $('#codeEditor');
    const $lineNumbers = $('#lineNumbers');
    const lines = $editor.val().split('\n').length;

    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += '<div>' + i + '</div>';
    }

    $lineNumbers.html(lineNumbersHtml);
}

/**
 * 라인 번호 스크롤 동기화
 */
function syncLineNumbersScroll() {
    const $editor = $('#codeEditor');
    const $lineNumbers = $('#lineNumbers');
    $lineNumbers.scrollTop($editor.scrollTop());
}

/**
 * View 토글 핸들러
 */
function onViewToggle() {
    const $btn = $(this);
    const view = $btn.data('view');

    if (view === currentViewMode) return;

    // 버튼 활성화 상태 변경
    $('.view-btn').removeClass('active');
    $btn.addClass('active');

    currentViewMode = view;

    if (view === 'form') {
        // 코드 에디터의 값을 폼에 반영
        syncCodeToForm();
        $('#codeView').hide();
        $('#formView').show();
    } else {
        // 폼의 값을 코드 에디터에 반영
        updateCodeEditor();
        $('#formView').hide();
        $('#codeView').show();
    }

    updateCurlCommand();
}

/**
 * 코드 에디터 내용을 폼에 동기화
 */
function syncCodeToForm() {
    try {
        const jsonData = JSON.parse($('#codeEditor').val());

        // 객체 컨테이너 내 입력 필드에 값 설정
        $('.object-children-container').each(function() {
            const $container = $(this);
            const objectName = $container.attr('data-object-name');
            const objectData = jsonData[objectName] || {};

            $container.find('.param-input:not(.array-item-input)').each(function() {
                const $input = $(this);
                const name = $input.attr('name');

                if (objectData[name] !== undefined && objectData[name] !== null) {
                    $input.val(objectData[name].toString());
                }
            });
        });

        // 배열 데이터 동기화
        $('.array-items-container').each(function() {
            const $container = $(this);
            const arrayName = $container.attr('data-array-name');
            const arrayData = jsonData[arrayName];

            if (Array.isArray(arrayData)) {
                // 배열 파라미터 스키마 가져오기
                const $addBtn = $(`.btn-add-array-item[data-array-name="${arrayName}"]`);
                const param = $addBtn.data('paramSchema');

                if (!param) return;

                // 기존 아이템 모두 제거
                $container.empty();

                // 새 아이템 생성
                arrayData.forEach((itemData, index) => {
                    const $arrayItem = createArrayItemForm(param, index, itemData);
                    $container.append($arrayItem);
                });

                // 배열이 비어있으면 빈 아이템 1개 추가
                if (arrayData.length === 0) {
                    const $arrayItem = createArrayItemForm(param, 0, {});
                    $container.append($arrayItem);
                }
            }
        });
    } catch (e) {
        console.error('JSON 파싱 오류:', e);
    }
}

/**
 * Request 섹션 렌더링
 */
function renderRequestSection(api) {
    // 메서드 배지
    const $methodBadge = $('#requestMethod');
    $methodBadge.text(api.method);
    $methodBadge.removeClass('get post put delete patch');
    $methodBadge.addClass(api.method.toLowerCase());

    // 경로
    $('#requestPath').text(api.path);

    // Curl 명령어 업데이트
    updateCurlCommand();
}

/**
 * Curl 명령어 업데이트
 */
function updateCurlCommand() {
    if (!currentApi) return;

    const ricConfig = CONFIG.RIC[currentRic];
    let path = currentApi.path;

    // Path 파라미터 치환
    const pathParams = getPathParameters();
    Object.keys(pathParams).forEach(key => {
        path = path.replace(`{${key}}`, pathParams[key]);
    });

    // Query 파라미터 추가
    const queryParams = getQueryParameters();
    const queryString = Object.keys(queryParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

    let fullUrl = ricConfig.baseUrl + path;
    if (queryString) {
        fullUrl += '?' + queryString;
    }

    let curl = `<span class="keyword">curl</span> -X ${currentApi.method} \\
--location  '<span class="url">${fullUrl}</span>'`;

    // 헤더 추가
    Object.keys(ricConfig.headers).forEach(key => {
        curl += ` \\
-H  "<span class="header-name">${key}</span>:<span class="header-value">${ricConfig.headers[key]}</span>"`;
    });

    // Body 추가 (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(currentApi.method)) {
        let bodyData;

        if (currentViewMode === 'code') {
            try {
                bodyData = JSON.parse($('#codeEditor').val());
            } catch (e) {
                bodyData = {};
            }
        } else {
            bodyData = buildRequestBodyFromForm();
        }

        if (Object.keys(bodyData).length > 0) {
            const bodyJson = JSON.stringify(bodyData, null, 2)
                .split('\n')
                .map((line, index) => index === 0 ? line : '   ' + line)
                .join('\n');

            curl += ` \\
--data '${bodyJson}'`;
        }
    }

    $('#curlCommand').html(curl);
}

/**
 * RIC 탭 클릭 핸들러
 */
function onRicTabClick() {
    const $tab = $(this);
    const ric = $tab.data('ric');

    if (ric === currentRic) return;

    // 탭 활성화 상태 변경
    $('.ric-tab').removeClass('active');
    $tab.addClass('active');

    currentRic = ric;

    // 헤더 정보 업데이트
    updateHeaderInfo();

    // Curl 명령어 업데이트
    updateCurlCommand();
}

/**
 * 헤더 정보 업데이트
 */
function updateHeaderInfo() {
    const ricConfig = CONFIG.RIC[currentRic];

    let html = '';
    Object.keys(ricConfig.headers).forEach(key => {
        html += `<div class="header-info-item">
            <span class="header-info-key">${key}</span>
            <div class="header-info-value-wrapper">
                <input type="text"
                       class="header-info-input"
                       data-header-key="${key}"
                       value="${escapeHtml(ricConfig.headers[key])}" />
            </div>
        </div>`;
    });

    $('#headerInfoContent').html(html);
}

/**
 * 헤더 입력 값 변경 핸들러
 */
function onHeaderInputChange() {
    const $input = $(this);
    const headerKey = $input.attr('data-header-key');
    const newValue = $input.val();

    // CONFIG의 현재 RIC 헤더 값 업데이트
    CONFIG.RIC[currentRic].headers[headerKey] = newValue;

    // Curl 명령어 실시간 업데이트
    updateCurlCommand();
}

/**
 * 헤더 값 초기화
 */
function resetHeaders() {
    // 기본값으로 복원
    CONFIG.RIC[currentRic].headers = JSON.parse(JSON.stringify(DEFAULT_HEADERS[currentRic]));

    // 모달 내용 갱신
    updateHeaderInfo();

    // Curl 명령어 업데이트
    updateCurlCommand();
}

/**
 * Header Info 모달 표시
 */
function showHeaderInfo() {
    const modal = new bootstrap.Modal(document.getElementById('headerInfoModal'));
    modal.show();
}

/**
 * API 실행
 */
function executeApi() {
    if (!currentApi) return;

    const ricConfig = CONFIG.RIC[currentRic];
    let path = currentApi.path;

    // Path 파라미터 치환
    const pathParams = getPathParameters();
    Object.keys(pathParams).forEach(key => {
        path = path.replace(`{${key}}`, pathParams[key]);
    });

    // Query 파라미터 추가
    const queryParams = getQueryParameters();
    const queryString = Object.keys(queryParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

    let fullUrl = ricConfig.baseUrl + path;
    if (queryString) {
        fullUrl += '?' + queryString;
    }

    // 요청 바디 구성
    let bodyData = null;
    if (['POST', 'PUT', 'PATCH'].includes(currentApi.method)) {
        if (currentViewMode === 'code') {
            try {
                bodyData = JSON.parse($('#codeEditor').val());
            } catch (e) {
                alert('JSON 형식이 올바르지 않습니다.');
                return;
            }
        } else {
            bodyData = buildRequestBodyFromForm();
        }
    }

    // 버튼 비활성화
    const $runBtn = $('#runBtn');
    $runBtn.prop('disabled', true).text('Loading...');

    // 더미 모드: 실제 API 대신 더미 응답 반환
    if (CONFIG.useDummyResponse) {
        setTimeout(function() {
            const dummyResponse = getDummyResponse(currentApi.id, bodyData);
            renderResponse(200, dummyResponse);
            $runBtn.prop('disabled', false).text('RUN');
        }, 500); // 0.5초 딜레이로 로딩 효과
        return;
    }

    // API Router를 통한 요청 (CORS 우회)
    // Router에 전달할 요청 정보 구성
    const routerRequest = {
        targetUrl: fullUrl,
        method: currentApi.method,
        headers: ricConfig.headers,
        body: bodyData
    };

    $.ajax({
        url: CONFIG.apiRouterEndpoint,
        method: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(routerRequest),
        success: function(response, status, xhr) {
            renderResponse(xhr.status, response);
        },
        error: function(xhr, status, error) {
            // 에러 응답 처리
            let errorResponse;
            try {
                errorResponse = JSON.parse(xhr.responseText);
            } catch (e) {
                errorResponse = {
                    error: error,
                    status: xhr.status,
                    message: xhr.responseText || 'Unknown error'
                };
            }
            renderResponse(xhr.status, errorResponse);
        },
        complete: function() {
            $runBtn.prop('disabled', false).text('RUN');
        }
    });
}

/**
 * 더미 응답 데이터 생성
 */
function getDummyResponse(apiId, requestBody) {
    const timestamp = new Date().toISOString();
    const transactionId = 'TXN_' + Date.now();

    const dummyResponses = {
        'EBP_API_104': {
            resultCode: '0000',
            resultMessage: '회원 탈퇴가 완료되었습니다.',
            data: {
                userNo: requestBody?.billing?.userNo || 'UNKNOWN_USER',
                withdrawalDate: timestamp,
                status: 'WITHDRAWN',
                supportUrl: 'https://support.example.com/help/withdrawal',
                privacyPolicyUrl: 'https://www.example.com/privacy-policy'
            }
        },
        'EBP_API_201': {
            resultCode: '0000',
            resultMessage: '결제가 승인되었습니다.',
            data: {
                transactionId: transactionId,
                orderId: requestBody?.payment?.orderId || 'ORDER_001',
                amount: requestBody?.payment?.amount || 10000,
                paymentMethod: requestBody?.payment?.paymentMethod || 'CARD',
                approvalNumber: 'APV' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                approvalDate: timestamp,
                receiptUrl: 'https://receipt.example.com/view/' + transactionId,
                cardReceiptUrl: 'https://www.cardcompany.com/receipt?id=' + transactionId,
                customer: {
                    customerId: requestBody?.customer?.customerId || 'CUST_001',
                    customerName: requestBody?.customer?.customerName || '홍길동'
                }
            },
            links: {
                self: 'https://api.example.com/ebp/v2/payment/' + transactionId,
                cancel: 'https://api.example.com/ebp/v2/payment/cancel',
                refund: 'https://api.example.com/ebp/v2/payment/refund'
            }
        },
        'EBP_API_202': {
            resultCode: '0000',
            resultMessage: '결제가 취소되었습니다.',
            data: {
                transactionId: requestBody?.cancel?.transactionId || 'TXN_001',
                cancelAmount: requestBody?.cancel?.cancelAmount || 10000,
                cancelReason: requestBody?.cancel?.cancelReason || '고객 요청',
                cancelDate: timestamp,
                refundStatus: 'COMPLETED',
                refundUrl: 'https://refund.example.com/status/' + transactionId,
                originalReceiptUrl: 'https://receipt.example.com/view/original/' + transactionId
            }
        },
        'EBP_API_203': {
            resultCode: '0000',
            resultMessage: '조회가 완료되었습니다.',
            data: {
                transactionId: 'TXN_20231220_001',
                orderId: 'ORDER_20231220_001',
                amount: 50000,
                paymentMethod: 'CARD',
                status: 'COMPLETED',
                approvalDate: '2023-12-20T10:30:00Z',
                receiptUrl: 'https://receipt.example.com/view/TXN_20231220_001',
                merchantUrl: 'https://merchant.example.com/order/ORDER_20231220_001',
                cardInfo: {
                    cardCompany: '삼성카드',
                    cardNumber: '****-****-****-1234',
                    installment: 0
                },
                documentUrls: [
                    'https://docs.example.com/invoice/INV_001.pdf',
                    'https://docs.example.com/receipt/RCP_001.pdf'
                ]
            }
        },
        'EBP_API_230': {
            resultCode: '0000',
            resultMessage: '토큰이 발급되었습니다.',
            data: {
                token: 'tok_' + Math.random().toString(36).substr(2, 24),
                tokenType: 'PAYMENT',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                cardInfo: {
                    cardNumber: '****-****-****-1111',
                    expiryDate: '12/25'
                },
                verificationUrl: 'https://verify.example.com/3ds/start',
                termsUrl: 'https://www.example.com/terms/payment'
            }
        },
        'EBP_API_301': {
            resultCode: '0000',
            resultMessage: '정기결제가 등록되었습니다.',
            data: {
                subscriptionId: 'SUB_' + Date.now(),
                planId: requestBody?.subscription?.planId || 'PLAN_001',
                customerId: requestBody?.subscription?.customerId || 'CUST_001',
                billingCycle: requestBody?.subscription?.billingCycle || 'MONTHLY',
                nextBillingDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: 'ACTIVE',
                managementUrl: 'https://billing.example.com/subscription/manage',
                cancelUrl: 'https://billing.example.com/subscription/cancel',
                webhookUrl: 'https://webhook.example.com/subscription/events'
            }
        },
        'EBP_API_302': {
            resultCode: '0000',
            resultMessage: '정기결제가 해지되었습니다.',
            data: {
                subscriptionId: requestBody?.subscription?.subscriptionId || 'SUB_001',
                cancelDate: timestamp,
                cancelReason: requestBody?.subscription?.cancelReason || '고객 요청',
                status: 'CANCELLED',
                refundInfoUrl: 'https://billing.example.com/refund/info',
                surveyUrl: 'https://survey.example.com/cancellation-feedback'
            }
        },
        'EBP_API_401': {
            resultCode: '0000',
            resultMessage: '복합 결제가 완료되었습니다.',
            data: {
                transactionId: transactionId,
                orderId: requestBody?.order?.orderId || 'ORDER_COMPLEX_001',
                orderName: requestBody?.order?.orderName || '복합 상품 주문',
                totalAmount: requestBody?.payment?.totalAmount || 38000,
                paymentMethod: requestBody?.payment?.method || 'CARD',
                approvalDate: timestamp,
                items: (requestBody?.items || []).map((item, index) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.quantity * item.unitPrice - (item.discountAmount || 0),
                    productUrl: `https://shop.example.com/product/${item.productId}`,
                    reviewUrl: `https://shop.example.com/review/${item.productId}`
                })),
                customer: {
                    customerId: requestBody?.customer?.customerId || 'CUST_001',
                    customerName: requestBody?.customer?.customerName || '홍길동',
                    email: requestBody?.customer?.email || 'customer@example.com'
                },
                urls: {
                    receipt: 'https://receipt.example.com/complex/' + transactionId,
                    orderDetail: 'https://order.example.com/detail/' + transactionId,
                    tracking: 'https://delivery.example.com/track/' + transactionId,
                    support: 'https://support.example.com/order/' + transactionId,
                    invoice: 'https://invoice.example.com/download/' + transactionId + '.pdf'
                }
            }
        }
    };

    return dummyResponses[apiId] || {
        resultCode: '0000',
        resultMessage: '요청이 처리되었습니다.',
        data: {
            timestamp: timestamp,
            apiId: apiId,
            moreInfoUrl: 'https://docs.example.com/api/' + apiId
        }
    };
}

/**
 * 응답 렌더링
 */
function renderResponse(status, response) {
    // 상태 표시
    const $status = $('#responseStatus');
    $status.text(`${status} 응답`);
    $status.removeClass('success error');
    $status.addClass(status >= 200 && status < 300 ? 'success' : 'error');

    // 응답 내용 (JSON 포맷팅 및 URL 링크 처리)
    let formattedResponse;

    if (typeof response === 'object') {
        formattedResponse = formatJsonWithLinks(response);
    } else {
        formattedResponse = escapeHtml(response);
    }

    $('#responseContent').html(formattedResponse);
    $('#responseSection').show();
}

/**
 * JSON을 HTML로 포맷팅 (URL 링크 포함)
 */
function formatJsonWithLinks(obj, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (obj === null) {
        return '<span class="json-null">null</span>';
    }

    if (typeof obj === 'boolean') {
        return `<span class="json-boolean">${obj}</span>`;
    }

    if (typeof obj === 'number') {
        return `<span class="json-number">${obj}</span>`;
    }

    if (typeof obj === 'string') {
        // URL 감지 및 링크 처리
        const urlPattern = /(https?:\/\/[^\s"]+)/g;
        const escapedStr = escapeHtml(obj);

        if (urlPattern.test(obj)) {
            const linkedStr = escapedStr.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
            return `<span class="json-string">"${linkedStr}"</span>`;
        }

        return `<span class="json-string">"${escapedStr}"</span>`;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';

        let result = '[\n';
        obj.forEach((item, index) => {
            result += spaces + '  ' + formatJsonWithLinks(item, indent + 1);
            if (index < obj.length - 1) result += ',';
            result += '\n';
        });
        result += spaces + ']';
        return result;
    }

    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';

        let result = '{\n';
        keys.forEach((key, index) => {
            result += spaces + '  ' + `<span class="json-key">"${escapeHtml(key)}"</span>: `;
            result += formatJsonWithLinks(obj[key], indent + 1);
            if (index < keys.length - 1) result += ',';
            result += '\n';
        });
        result += spaces + '}';
        return result;
    }

    return String(obj);
}

/**
 * HTML 이스케이프
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * 요청 복사
 */
function copyRequest() {
    const curlText = $('#curlCommand').text();

    navigator.clipboard.writeText(curlText).then(() => {
        const $btn = $('#copyRequestBtn');
        const originalText = $btn.text();
        $btn.text('Copied!');

        setTimeout(() => {
            $btn.text(originalText);
        }, 2000);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}

/**
 * 파라미터 툴팁 표시
 */
function showParamTooltip(e) {
    const $btn = $(this);
    const paramInfo = $btn.data('paramInfo');

    if (!paramInfo) return;

    const $tooltip = $('#paramTooltip');

    // 툴팁 내용 설정 - 이미 Form view에서 보여지는 정보는 제외
    // (이름, 타입, 필수여부, max size는 이미 라벨에 표시됨)
    $tooltip.find('.tooltip-title').text(paramInfo.name);
    $tooltip.find('.tooltip-type').text(''); // 타입/필수 정보는 이미 표시되어 있으므로 제거
    $tooltip.find('.tooltip-desc').text(paramInfo.description || '');

    // maxLength는 이미 Form view에 표시되므로 제외, 나머지 제약조건만 표시
    let constraints = '';
    if (paramInfo.minLength) {
        constraints += `<span>최소 길이: ${paramInfo.minLength}</span>`;
    }
    if (paramInfo.pattern) {
        constraints += `<span>패턴: ${paramInfo.pattern}</span>`;
    }
    if (paramInfo.minValue !== undefined) {
        constraints += `<span>최소값: ${paramInfo.minValue}</span>`;
    }
    if (paramInfo.maxValue !== undefined) {
        constraints += `<span>최대값: ${paramInfo.maxValue}</span>`;
    }
    if (paramInfo.enum) {
        constraints += `<span>허용값: ${formatEnumDisplay(paramInfo.enum)}</span>`;
    }
    $tooltip.find('.tooltip-constraints').html(constraints);

    // 표시할 내용이 없으면 툴팁 숨기기
    const hasContent = paramInfo.description || constraints;
    if (!hasContent) {
        return;
    }

    // 위치 계산
    const btnOffset = $btn.offset();
    const btnWidth = $btn.outerWidth();

    $tooltip.css({
        top: btnOffset.top - 10,
        left: btnOffset.left + btnWidth + 10
    }).show();
}

/**
 * 파라미터 툴팁 숨김
 */
function hideParamTooltip() {
    $('#paramTooltip').hide();
}

/**
 * 로딩 표시
 */
function showLoading() {
    if ($('.loading-overlay').length === 0) {
        $('body').append('<div class="loading-overlay"><div class="spinner"></div></div>');
    }
    $('.loading-overlay').show();
}

/**
 * 로딩 숨김
 */
function hideLoading() {
    $('.loading-overlay').hide();
}

/**
 * enum 배열을 표시용 문자열로 변환
 * @param {Array} enumArray - enum 배열 (문자열 배열 또는 {code, label} 객체 배열)
 * @returns {string} 표시용 문자열
 */
function formatEnumDisplay(enumArray) {
    if (!enumArray || enumArray.length === 0) return '';

    // 첫 번째 요소로 형태 판단
    if (typeof enumArray[0] === 'object' && enumArray[0].code !== undefined) {
        // {code, label} 형태
        return enumArray.map(item => `${item.code}(${item.label})`).join(' | ');
    } else {
        // 단순 문자열 배열 형태 (하위 호환)
        return enumArray.join(' | ');
    }
}
