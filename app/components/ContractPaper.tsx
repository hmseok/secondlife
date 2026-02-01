import React from 'react'

const numberToKorean = (number: number) => {
  if (!number) return ''
  return number.toLocaleString()
}

export default function ContractPaper({ data, car, signatureUrl }: { data: any, car: any, signatureUrl?: string }) {
  const today = new Date()

  // 🎨 스타일 정의
  const styles = {
    // ... (위쪽 container, title 등은 기존과 동일) ...
    container: {
      backgroundColor: '#ffffff',
      color: '#222222',
      fontFamily: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
      fontSize: '12px',
      letterSpacing: '-0.5px',
      lineHeight: '1.5',
      width: '210mm',
      minHeight: '297mm',
      padding: '12mm 18mm',
      margin: '0 auto',
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
    },
    title: {
      fontSize: '26px',
      fontWeight: '900',
      textAlign: 'center' as const,
      borderBottom: '3px solid #000000',
      paddingBottom: '12px',
      marginBottom: '25px',
      marginTop: '10px'
    },
    partyBox: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '20px',
      marginBottom: '25px',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '20px'
    },
    partyCol: { flex: 1 },
    partyHeader: {
      fontSize: '15px',
      fontWeight: 'bold',
      marginBottom: '8px',
      backgroundColor: '#f3f4f6',
      padding: '6px 10px',
      borderRadius: '4px',
      borderBottom: '2px solid #d1d5db'
    },
    row: { display: 'flex', marginBottom: '4px', alignItems: 'center' },
    label: { fontWeight: 'bold', width: '60px', color: '#4b5563', flexShrink: 0 },
    value: { flex: 1, fontWeight: '600', wordBreak: 'keep-all' as const },
    articleTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginTop: '16px',
      marginBottom: '6px',
      color: '#111827'
    },
    contentIndent: { paddingLeft: '10px', color: '#374151' },
    specialBox: {
      padding: '10px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      whiteSpace: 'pre-wrap' as const,
      fontSize: '12px',
      marginTop: '5px',
      minHeight: '40px'
    },
    footer: { marginTop: '35px', textAlign: 'center' as const },

    // 👇 [핵심 수정] 도장 위치 및 크기 조정 (현실 고증)
    sealWrapper: {
        position: 'relative' as const,
        display: 'inline-block',
        width: '40px', // 글자 공간을 조금 더 확보
        textAlign: 'center' as const
    },
    sealImage: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        // 📏 실제 도장 크기(약 2cm) 반영
        height: '75px',
        width: 'auto',
        objectFit: 'contain' as const,
        opacity: 0.85,
        mixBlendMode: 'multiply' as const,
        pointerEvents: 'none' as const
    },
    signImage: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        // ✍️ 서명도 시원하게 키움
        height: '60px',
        width: 'auto',
        objectFit: 'contain' as const,
        mixBlendMode: 'multiply' as const
    }
  }

  return (
    <div id="printable-area" style={styles.container}>
      <h1 style={styles.title}>차량 운영 투자 및 수익 배분 계약서</h1>

      {/* 1. 상단 정보 (갑 -> 을 순서 통일) */}
      <div style={styles.partyBox}>
        <div style={styles.partyCol}>
           <div style={styles.partyHeader}>운용사 (이하 '갑')</div>
           <div style={styles.row}><span style={styles.label}>상호</span> <span style={styles.value}>(주)에프엠아이</span></div>
           <div style={styles.row}><span style={styles.label}>대표</span> <span style={styles.value}>박진숙</span></div>
           <div style={styles.row}><span style={styles.label}>주소</span> <span style={styles.value}>경기도 연천군 백동로236번길 190</span></div>
        </div>

        <div style={styles.partyCol}>
           <div style={styles.partyHeader}>투자자 (이하 '을')</div>
           <div style={styles.row}><span style={styles.label}>성명</span> <span style={styles.value}>{data.investor_name}</span></div>
           <div style={styles.row}><span style={styles.label}>연락처</span> <span style={styles.value}>{data.investor_phone}</span></div>
           <div style={styles.row}><span style={styles.label}>주소</span> <span style={styles.value}>{data.investor_address}</span></div>
        </div>
      </div>

      <p style={{textAlign: 'center', marginBottom: '20px', fontWeight: 'bold'}}>
        '갑'과 '을'은 차량 운영 사업을 위한 투자 및 수익 배분에 관하여 다음과 같이 계약을 체결한다.
      </p>

      {/* 2. 본문 내용 */}
      <div>
          <div>
              <h2 style={styles.articleTitle}>제1조 (목적)</h2>
              <p style={{...styles.contentIndent, textAlign: 'justify'}}>
                본 계약은 '을'이 '갑'의 모빌리티 사업 확장을 위해 자금을 투자하고, '갑'은 해당 자금으로 차량을 매입·운용하여 발생한 수익을 배분하는 것을 목적으로 한다.
              </p>
          </div>

          <div>
              <h2 style={styles.articleTitle}>제2조 (투자금의 납입 및 용도)</h2>
              <div style={styles.contentIndent}>
                <p>1. '을'은 <b>금 {numberToKorean(data.invest_amount)}원 (₩{data.invest_amount?.toLocaleString()})</b>을 '갑'에게 지급한다.</p>
                <p>2. '갑'은 위 자금을 <b>[{car?.brand} {car?.model} / {car?.number}]</b> 구입 및 등록에 사용한다.</p>
              </div>
          </div>

          <div>
              <h2 style={styles.articleTitle}>제3조 (소유권 및 관리)</h2>
              <div style={styles.contentIndent}>
                <p>1. 차량의 소유권 및 명의는 '갑'에게 귀속되며, 운영/관리 책임 또한 '갑'이 진다.</p>
                <p>2. 단, 과태료 등은 실제 운전자에게 부과하되, 미납 시 <b>수익 정산 시 우선 공제</b>한다.</p>
              </div>
          </div>

          <div>
              <h2 style={styles.articleTitle}>제4조 (수익 정산 및 배분)</h2>
              <div style={styles.contentIndent}>
                <p>1. <b>[관리비]</b> 매월 <b>금 {data.admin_fee?.toLocaleString()}원</b>을 매출에서 선공제한다.</p>
                <p>2. <b>[배분]</b> 공제 후 잔액을 <b>갑 {100 - data.share_ratio}% : 을 {data.share_ratio}%</b> 비율로 나눈다.</p>
                <p>3. <b>[지급]</b> 매월 말일 정산하여, <b>익월 {data.payout_day}일</b>까지 지급한다.</p>
                <p style={{color: '#6b7280', fontSize: '11px', marginTop: '4px'}}>└ 계좌: {data.bank_name} {data.account_number} ({data.account_holder})</p>
              </div>
          </div>

          <div>
              <h2 style={styles.articleTitle}>제5조 (계약 기간 및 종료)</h2>
              <div style={styles.contentIndent}>
                <p>1. 기간: <b>{data.contract_start_date} ~ {data.contract_end_date}</b> (36개월)</p>
                <p>2. 종료 시 차량을 매각하여 제반 비용을 제외한 전액을 '을'에게 반환한다.</p>
                <p>3. '을'이 원할 경우 차량을 <b>인수(명의 이전)</b>할 수 있다. (취등록세 '을' 부담)</p>
              </div>
          </div>

          <div>
              <h2 style={styles.articleTitle}>제6조 (특약 사항)</h2>
              <div style={styles.specialBox}>
                {data.memo || "특이사항 없음."}
                {data.mortgage_setup && "\n* 본 차량에 대하여 근저당권 설정을 진행함."}
              </div>
          </div>
      </div>

      {/* 3. 하단 서명란 */}
      <div style={styles.footer}>
        <p style={{marginBottom: '15px', color: '#666'}}>위 계약을 증명하기 위하여 계약서 2통(전자파일 포함)을 작성하여 보관한다.</p>
        <p style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '30px'}}>{today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일</p>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 10px'}}>

            {/* 왼쪽: 갑 (운용사) */}
            <div style={{textAlign: 'left', position: 'relative', width: '48%'}}>
                <p style={{fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', borderBottom:'2px solid #000', paddingBottom:'4px'}}>(갑) 운용사</p>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}><span>상호</span> <span style={{fontWeight:'bold'}}>(주)에프엠아이</span></div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>대표이사</span>
                    <span>
                        박진숙
                        <span style={styles.sealWrapper}>
                            (인)
                            <img src="/stamp.png" alt="직인" style={styles.sealImage} />
                        </span>
                    </span>
                </div>
            </div>

            {/* 오른쪽: 을 (투자자) */}
            <div style={{textAlign: 'left', position: 'relative', width: '48%'}}>
                <p style={{fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', borderBottom:'2px solid #000', paddingBottom:'4px'}}>(을) 투자자</p>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px', alignItems:'center'}}>
                    <span>성명</span>
                    <span>
                        {data.investor_name}
                        <span style={styles.sealWrapper}>
                            (인)
                            {signatureUrl && <img src={signatureUrl} alt="서명" style={styles.signImage} />}
                        </span>
                    </span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>연락처</span> <span>{data.investor_phone}</span></div>
            </div>
        </div>
      </div>
    </div>
  )
}