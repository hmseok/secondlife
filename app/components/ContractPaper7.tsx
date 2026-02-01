import React from 'react'

const numberToKorean = (number: number) => {
  if (!number) return ''
  return number.toLocaleString()
}

export default function ContractPaper({ data, car, signatureUrl }: { data: any, car: any, signatureUrl?: string }) {
  const today = new Date()

  // 공통 스타일 변수 (Tailwind 간섭 차단용)
  const baseStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif', // 폰트 강제 지정
    fontSize: '12px',
    lineHeight: '1.6',
    width: '210mm',
    minHeight: '297mm',
    padding: '20mm',
    margin: '0 auto',
    boxSizing: 'border-box',
    position: 'relative'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '900',
    textAlign: 'center',
    borderBottom: '2px solid #000000',
    paddingBottom: '10px',
    marginBottom: '30px'
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '4px',
    marginTop: '16px'
  }

  const flexRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '20px'
  }

  const boxStyle: React.CSSProperties = {
    flex: 1
  }

  const headerStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    borderBottom: '1px solid #000000',
    marginBottom: '8px',
    paddingBottom: '4px'
  }

  return (
    <div id="printable-area" style={baseStyle}>
      <h1 style={titleStyle}>차량 운영 투자 및 수익 배분 계약서</h1>

      {/* 갑/을 정보 */}
      <div style={flexRowStyle}>
        <div style={boxStyle}>
           <h3 style={headerStyle}>투자자 (이하 '을')</h3>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>성명:</span> {data.investor_name}</p>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>연락처:</span> {data.investor_phone}</p>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>주소:</span> {data.investor_address}</p>
        </div>
        <div style={boxStyle}>
           <h3 style={headerStyle}>운용사 (이하 '갑')</h3>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>상호:</span> (주)에프엠아이</p>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>대표:</span> 박진숙</p>
           <p><span style={{fontWeight:'bold', display:'inline-block', width:'60px'}}>주소:</span> 경기도 연천군 백동로236번길 190</p>
        </div>
      </div>

      <p style={{textAlign: 'justify', marginBottom: '20px'}}>
        '갑'과 '을'은 차량 운영 사업을 위한 투자 및 수익 배분에 관하여 다음과 같이 계약을 체결한다.
      </p>

      {/* 본문 */}
      <div>
          <div>
              <h2 style={sectionTitleStyle}>제1조 (목적)</h2>
              <p style={{paddingLeft: '10px', textAlign: 'justify'}}>
                본 계약은 '을'이 '갑'의 렌터카 및 모빌리티 사업 확장을 위하여 자금을 투자하고, '갑'은 해당 자금으로 차량을 매입·운용하여 발생한 수익을 '을'에게 배분하는 것을 목적으로 한다.
              </p>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제2조 (투자금의 납입 및 용도)</h2>
              <div style={{paddingLeft: '10px'}}>
                <p>1. '을'은 <b>일금 {numberToKorean(data.invest_amount)}원 (₩{data.invest_amount?.toLocaleString()})</b>을 '갑'에게 투자금으로 지급한다.</p>
                <p>2. '갑'은 위 투자금을 <b>[{car?.brand} {car?.model} / {car?.number}]</b> (이하 "본 건 차량")을 구입 및 등록하는 용도로 사용하여야 한다.</p>
              </div>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제3조 (차량의 소유권 및 관리)</h2>
              <div style={{paddingLeft: '10px'}}>
                <p>1. "본 건 차량"의 소유권 및 자동차등록원부상 명의는 전적으로 '갑'에게 귀속된다.</p>
                <p>2. 차량의 운영, 배차, 유지보수, 보험 가입 등 운영 전반에 관한 권한과 책임은 '갑'이 수행한다.</p>
                <p>3. 단, 과태료 및 범칙금은 실제 운전자에게 부과함을 원칙으로 하며, 미납 시 <b>수익 정산 시 우선 공제</b>한다.</p>
              </div>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제4조 (수익의 정산 및 배분)</h2>
              <div style={{paddingLeft: '10px'}}>
                <p>1. <b>[위탁 관리비]</b> 매월 <b>금 {data.admin_fee?.toLocaleString()}원</b>을 매출에서 우선 공제한다.</p>
                <p>2. <b>[수익 배분]</b> 공제 후 잔액을 <b>갑 {100 - data.share_ratio}% : 을 {data.share_ratio}%</b> 비율로 나눈다.</p>
                <p>3. <b>[지급 시기]</b> 매월 말일 정산하여, <b>익월 {data.payout_day}일</b>까지 지급한다.</p>
                <p style={{color: '#555', fontSize: '11px', marginTop: '5px'}}>└ 계좌: {data.bank_name} {data.account_number} ({data.account_holder})</p>
              </div>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제5조 (세금 처리)</h2>
              <p style={{paddingLeft: '10px'}}>
                수익금 지급 시 <b>'{data.tax_type}'</b> 방식으로 세무 처리를 진행한다. (세액 공제 후 지급)
              </p>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제6조 (계약 기간 및 종료)</h2>
              <div style={{paddingLeft: '10px'}}>
                <p>1. 계약기간: <b>{data.contract_start_date} ~ {data.contract_end_date}</b> (36개월)</p>
                <p>2. 만료 시 차량을 매각하여 제반 비용을 제외한 전액을 '을'에게 반환한다.</p>
                <p>3. '을'이 희망할 경우 차량을 <b>인수(명의 이전)</b>할 수 있다. (비용 '을' 부담)</p>
              </div>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제7조 (중도 해지 및 위약금)</h2>
              <p style={{paddingLeft: '10px'}}>
                귀책 사유로 인한 중도 해지 시, 귀책 당사자는 상대방에게 <b>위탁 관리비의 3개월분</b>을 배상한다.
              </p>
          </div>

          <div>
              <h2 style={sectionTitleStyle}>제8조 (특약 사항)</h2>
              <div style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minHeight: '40px',
                  whiteSpace: 'pre-wrap'
              }}>
                {data.memo || "특이사항 없음."}
                {data.mortgage_setup && "\n* 본 차량에 대하여 근저당권 설정을 진행함."}
              </div>
          </div>
      </div>

      <div style={{marginTop: '50px', textAlign: 'center'}}>
        <p style={{marginBottom: '20px'}}>위 계약을 증명하기 위하여 계약서 2통을 작성하여 보관한다.</p>
        <p style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '40px'}}>{today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일</p>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 40px'}}>

            {/* 갑 */}
            <div style={{textAlign: 'left', position: 'relative'}}>
                <p style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '10px'}}>(갑) 운용사</p>
                <p style={{marginBottom: '5px'}}>상호: (주)에프엠아이</p>
                <div style={{position: 'relative'}}>
                    <p style={{position: 'relative', zIndex: 10}}>대표이사: 박진숙 (인)</p>
                    <img
                        src="/stamp.png"
                        alt="직인"
                        style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '50px',
                            width: '60px',
                            height: '60px',
                            opacity: 0.8,
                            mixBlendMode: 'multiply' // 배경 투명하게 겹침
                        }}
                    />
                </div>
            </div>

            {/* 을 */}
            <div style={{textAlign: 'left', position: 'relative'}}>
                <p style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '10px'}}>(을) 투자자</p>
                <div style={{position: 'relative'}}>
                    <p style={{marginBottom: '5px'}}>성명: {data.investor_name} (인)</p>
                    {signatureUrl && (
                        <img
                            src={signatureUrl}
                            alt="서명"
                            style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '40px',
                                width: '80px',
                                height: '50px',
                                objectFit: 'contain',
                                mixBlendMode: 'multiply'
                            }}
                        />
                    )}
                </div>
                <p>연락처: {data.investor_phone}</p>
            </div>
        </div>
      </div>
    </div>
  )
}