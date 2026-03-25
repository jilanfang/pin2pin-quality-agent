from app.core.schemas import OrchestrationResult
from app.services.extractor import extract_case_state


def test_extractor_returns_known_facts_and_gaps():
    result = extract_case_state(
        'Customer reports intermittent failure on batch B12 discovered on March 1.'
    )
    assert isinstance(result, OrchestrationResult)
    assert isinstance(result.known_facts, list)
    assert isinstance(result.missing_fields, list)


def test_extractor_understands_basic_chinese_case_fields():
    result = extract_case_state(
        '客户反馈批次B12在2026-03-01发现黑屏异常，影响120台。'
    )
    fact_map = {item.field: item.value for item in result.known_facts}

    assert fact_map['batch'] == 'B12'
    assert fact_map['discovery_time'] == '2026-03-01'
    assert fact_map['impact'] == '120台'


def test_extractor_understands_batch_number_variant():
    result = extract_case_state('批次号111')
    fact_map = {item.field: item.value for item in result.known_facts}

    assert fact_map['batch'] == '111'


def test_extractor_returns_chinese_gap_reasons():
    result = extract_case_state('客户反馈黑屏异常。')
    reasons = {item.field: item.reason for item in result.missing_fields}

    assert reasons['batch'] == '缺少异常批次'
    assert reasons['discovery_time'] == '缺少首次发现时间'
    assert reasons['impact'] == '缺少影响范围'


def test_extractor_understands_manufacturing_metadata_variants():
    result = extract_case_state(
        '客户ABC项目Pioneer机种X1，Lot L240301，Date Code 2403，线别L3，AOI站，工单WO-7788。'
    )
    fact_map = {item.field: item.value for item in result.known_facts}

    assert fact_map['customer'] == 'ABC'
    assert fact_map['project'] == 'Pioneer'
    assert fact_map['model'] == 'X1'
    assert fact_map['lot'] == 'L240301'
    assert fact_map['date_code'] == '2403'
    assert fact_map['line'] == 'L3'
    assert fact_map['station'] == 'AOI'
    assert fact_map['work_order'] == 'WO-7788'


def test_extractor_captures_containment_and_validation_records():
    result = extract_case_state(
        '已对库存和在制全部隔离，暂停出货，并完成24pcs复测验证，结果OK。'
    )
    fact_map = {item.field: item.value for item in result.known_facts}

    assert fact_map['containment_action'] == '已对库存和在制全部隔离，暂停出货'
    assert fact_map['validation_record'] == '完成24pcs复测验证，结果OK'
