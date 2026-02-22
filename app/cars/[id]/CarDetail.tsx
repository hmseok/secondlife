'use client'
import { supabase } from '../../utils/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
export default function CarDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const carId = Array.isArray(id) ? id[0] : id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [car, setCar] = useState<any>(null)

  // 💰 금융(대출) 관련 상태
  const [loans, setLoans] = useState<any[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [newLoan, setNewLoan] = useState({
    finance_name: '', type: '할부', total_amount: 0, monthly_payment: 0, payment_date: 25, start_date: '', end_date: ''
  })

  // 1. 차량 기본 데이터 불러오기
  useEffect(() => {
    if (!carId) return
    const fetchCar = async () => {
      const { data, error } = await supabase.from('cars').select('*').eq('id', carId).single()
      if (error) { alert('차량 정보를 불러오지 못했습니다.'); router.push('/cars') }
      else { setCar(data) }
      setLoading(false)
    }
    fetchCar()
  }, [carId, router])

  // 2. 탭이 바뀔 때 해당 데이터 불러오기
  useEffect(() => {
    if (activeTab === 'finance') fetchLoans()
  }, [activeTab])

  // 🏦 대출 목록 불러오기
  const fetchLoans = async () => {
    setLoadingLoans(true)
    const { data, error } = await supabase.from('loans').select('*').eq('car_id', carId).order('created_at', { ascending: false })
    if (!error) setLoans(data || [])
    setLoadingLoans(false)
  }

  // 🏦 대출 추가하기
  const handleAddLoan = async () => {
    if (!newLoan.finance_name || !newLoan.total_amount) return alert('금융사명과 원금은 필수입니다.')

    const { error } = await supabase.from('loans').insert({
      car_id: carId,
      ...newLoan
    })

    if (error) alert('추가 실패: ' + error.message)
    else {
      alert('금융 정보가 등록되었습니다.')
      setNewLoan({ finance_name: '', type: '할부', total_amount: 0, monthly_payment: 0, payment_date: 25, start_date: '', end_date: '' }) // 초기화
      fetchLoans() // 목록 새로고침
    }
  }

  // 🏦 대출 삭제하기
  const handleDeleteLoan = async (loanId: number) => {
    if (!confirm('이 금융 이력을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('loans').delete().eq('id', loanId)
    if (error) alert('삭제 실패')
    else fetchLoans()
  }

  const handleChange = (field: string, value: any) => {
    setCar((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleUpdate = async () => {
    setSaving(true)
    const { error } = await supabase.from('cars').update({
        number: car.number, brand: car.brand, model: car.model, trim: car.trim,
        year: car.year, fuel: car.fuel, status: car.status, location: car.location,
        mileage: car.mileage, purchase_price: car.purchase_price, acq_date: car.acq_date,
        is_used: car.is_used, purchase_mileage: car.purchase_mileage,
        // 지입 관련
        ownership_type: car.ownership_type, owner_name: car.owner_name, owner_phone: car.owner_phone,
        owner_bank: car.owner_bank, owner_account: car.owner_account, owner_account_holder: car.owner_account_holder,
        consignment_fee: car.consignment_fee, consignment_start: car.consignment_start || null,
        consignment_end: car.consignment_end || null, insurance_by: car.insurance_by,
        consignment_contract_url: car.consignment_contract_url, owner_memo: car.owner_memo
      }).eq('id', carId)
    setSaving(false)
    if (error) alert('저장 실패: ' + error.message)
    else alert('✅ 저장되었습니다!')
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('cars').delete().eq('id', carId)
    if (error) alert('삭제 실패')
    else { alert('삭제되었습니다.'); router.push('/cars') }
  }

  if (loading) return <div className="p-20 text-center">로딩 중... ⏳</div>
  if (!car) return null

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-fade-in-up pb-20">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/cars')} className="bg-white px-4 py-2 border rounded-xl font-bold text-gray-500 hover:bg-gray-50">← 목록</button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              차량 상세 정보
              <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${car.status === '운행중' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                {car.status}
              </span>
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-0.5">관리번호: {car.id} / {car.brand} {car.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="px-4 py-2 border border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50">삭제</button>
          <button onClick={handleUpdate} disabled={saving} className="px-6 py-2 bg-steel-600 text-white font-bold rounded-xl shadow-lg hover:bg-steel-700 transition-all">
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 좌측: 요약 정보 카드 */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-between items-start mb-8">
                <div>
                   <p className="text-gray-400 text-xs font-bold mb-1">Vehicle No.</p>
                   <div className="bg-white text-black px-4 py-2 rounded-lg border-2 border-black inline-block shadow-lg">
                      <span className="text-2xl font-black tracking-widest">{car.number}</span>
                   </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                    <p className="text-gray-400 text-xs font-bold">모델명</p>
                    <p className="text-lg font-bold truncate">{car.brand} {car.model}</p>
                 </div>
                 <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                    <p className="text-gray-400 text-xs font-bold">주행거리</p>
                    <p className="text-lg font-bold">{car.mileage?.toLocaleString()} km</p>
                 </div>
              </div>
              {/* 신차/중고차 구분 */}
              <div className="mt-4 flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  car.is_used ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {car.is_used ? '🔄 중고차' : '🆕 신차'}
                </span>
                {car.is_used && car.purchase_mileage > 0 && (
                  <span className="text-xs text-gray-400">
                    구입시 주행거리: <b className="text-white">{car.purchase_mileage?.toLocaleString()}km</b>
                  </span>
                )}
              </div>
           </div>

           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
             <div>
                <label className="text-xs font-bold text-gray-400">현재 차고지</label>
                <input className="w-full font-bold border-b py-2 mt-1 focus:outline-none focus:border-steel-500 text-sm"
                  value={car.location || ''}
                  onChange={e => handleChange('location', e.target.value)}
                  placeholder="위치 정보 입력"
                />
             </div>
           </div>
        </div>

        {/* 우측: 탭 메뉴 및 상세 내용 */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {['basic', 'insurance', 'finance', 'jiip', 'invest'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-5 font-bold capitalize transition-all border-b-2 whitespace-nowrap px-4 ${
                  activeTab === tab ? 'text-steel-600 border-steel-600 bg-steel-50/30' : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {tab === 'basic' && '📋 기본 정보'}
                {tab === 'insurance' && '🛡️ 보험 이력'}
                {tab === 'finance' && '💰 대출/금융'}
                {tab === 'jiip' && '🤝 지입 관리'}
                {tab === 'invest' && '📈 투자 관리'}
              </button>
            ))}
          </div>

          <div className="p-8 flex-1 bg-gray-50/50">
             {/* 📋 기본 정보 탭 */}
             {activeTab === 'basic' && (
               <div className="flex flex-col items-center justify-center h-full py-10 animate-fade-in">
                 <div className="bg-white p-6 rounded-full mb-4 shadow-sm"><span className="text-4xl">🚙</span></div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">차량 제원 및 등록증</h3>
                 <p className="text-gray-400 mb-6 text-center text-sm">자동차등록증 상의 제원 정보와 원본 파일을 관리합니다.</p>
                 <button onClick={() => router.push(`/registration/${carId}`)} className="bg-steel-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-steel-700 transition-all">등록증 상세 페이지로 이동 →</button>
               </div>
             )}

             {/* 🛡️ 보험 이력 탭 */}
             {activeTab === 'insurance' && (
              <div className="flex flex-col items-center justify-center h-full py-10 animate-fade-in">
                <div className="bg-white p-6 rounded-full mb-4 shadow-sm"><span className="text-4xl">🛡️</span></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">보험 이력 관리</h3>
                <button onClick={() => router.push(`/insurance/${carId}`)} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform hover:-translate-y-1 mt-4">보험 상세 페이지로 이동 →</button>
              </div>
            )}

            {/* 🤝 지입 관리 탭 */}
            {activeTab === 'jiip' && (
              <div className="animate-fade-in space-y-6">
                {/* 소유 구분 선택 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📌 소유 구분</h3>
                  <div className="flex gap-3">
                    {[
                      { value: 'company', label: '자사 보유', desc: '사업자 명의 차량', color: 'blue' },
                      { value: 'consignment', label: '지입 차량', desc: '타인 명의, 우리가 운영', color: 'amber' },
                      { value: 'leased_in', label: '임차 차량', desc: '외부에서 빌려온 차량', color: 'purple' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => handleChange('ownership_type', opt.value)}
                        className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                          car.ownership_type === opt.value
                            ? opt.color === 'blue' ? 'border-blue-500 bg-blue-50'
                              : opt.color === 'amber' ? 'border-amber-500 bg-amber-50'
                              : 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 지입/임차인 경우 상세 정보 */}
                {(car.ownership_type === 'consignment' || car.ownership_type === 'leased_in') && (
                  <>
                    {/* 지입주 정보 */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">👤 {car.ownership_type === 'consignment' ? '지입주' : '임대인'} 정보</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">이름</label>
                          <input className="w-full border rounded-lg p-2.5 text-sm" placeholder="홍길동"
                            value={car.owner_name || ''} onChange={e => handleChange('owner_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">연락처</label>
                          <input className="w-full border rounded-lg p-2.5 text-sm" placeholder="010-0000-0000"
                            value={car.owner_phone || ''} onChange={e => handleChange('owner_phone', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* 정산 계좌 */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🏦 정산 계좌</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">은행명</label>
                          <input className="w-full border rounded-lg p-2.5 text-sm" placeholder="신한은행"
                            value={car.owner_bank || ''} onChange={e => handleChange('owner_bank', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">계좌번호</label>
                          <input className="w-full border rounded-lg p-2.5 text-sm" placeholder="110-123-456789"
                            value={car.owner_account || ''} onChange={e => handleChange('owner_account', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">예금주</label>
                          <input className="w-full border rounded-lg p-2.5 text-sm" placeholder="홍길동"
                            value={car.owner_account_holder || ''} onChange={e => handleChange('owner_account_holder', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* 계약 조건 */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📝 계약 조건</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">월 {car.ownership_type === 'consignment' ? '지입료' : '임차료'}</label>
                          <input type="number" className="w-full border rounded-lg p-2.5 text-sm" placeholder="0"
                            value={car.consignment_fee || ''} onChange={e => handleChange('consignment_fee', Number(e.target.value))} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">보험 주체</label>
                          <select className="w-full border rounded-lg p-2.5 text-sm"
                            value={car.insurance_by || 'company'} onChange={e => handleChange('insurance_by', e.target.value)}>
                            <option value="company">우리 회사</option>
                            <option value="owner">{car.ownership_type === 'consignment' ? '지입주' : '임대인'} 본인</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">계약 시작일</label>
                          <input type="date" className="w-full border rounded-lg p-2.5 text-sm"
                            value={car.consignment_start || ''} onChange={e => handleChange('consignment_start', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">계약 종료일</label>
                          <input type="date" className="w-full border rounded-lg p-2.5 text-sm"
                            value={car.consignment_end || ''} onChange={e => handleChange('consignment_end', e.target.value)} />
                          {car.consignment_end && new Date(car.consignment_end) < new Date() && (
                            <p className="text-xs text-red-500 mt-1 font-bold">⚠️ 계약이 만료되었습니다</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 계약서 첨부 + 메모 */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📎 계약서 및 메모</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">계약서 파일 URL</label>
                          <div className="flex gap-2">
                            <input className="flex-1 border rounded-lg p-2.5 text-sm" placeholder="Supabase Storage URL 또는 외부 링크"
                              value={car.consignment_contract_url || ''} onChange={e => handleChange('consignment_contract_url', e.target.value)} />
                            {car.consignment_contract_url && (
                              <a href={car.consignment_contract_url} target="_blank" rel="noopener noreferrer"
                                className="bg-steel-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-steel-700 whitespace-nowrap">열기</a>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">메모 / 특약사항</label>
                          <textarea className="w-full border rounded-lg p-2.5 text-sm" rows={3}
                            placeholder="특약사항, 정산 조건 등 참고 내용"
                            value={car.owner_memo || ''} onChange={e => handleChange('owner_memo', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* 저장 버튼 */}
                    <button onClick={handleUpdate} disabled={saving}
                      className="w-full bg-steel-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-steel-700 transition-colors disabled:opacity-50">
                      {saving ? '저장 중...' : '💾 지입 정보 저장'}
                    </button>
                  </>
                )}

                {car.ownership_type === 'company' && (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-4">🏢</div>
                    <p className="font-bold text-lg text-gray-500">자사 보유 차량</p>
                    <p className="text-sm mt-2">자사 명의로 등록된 차량은 별도 지입 정보가 필요하지 않습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 💰 [신규] 대출/금융 탭 */}
            {activeTab === 'finance' && (
              <div className="animate-fade-in space-y-8">
                {/* 1. 입력 폼 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">➕ 금융/대출 정보 등록</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">금융사 (캐피탈)</label>
                      <input className="w-full border rounded-lg p-2 text-sm" placeholder="예: 현대캐피탈" value={newLoan.finance_name} onChange={e => setNewLoan({...newLoan, finance_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">구분</label>
                      <select className="w-full border rounded-lg p-2 text-sm" value={newLoan.type} onChange={e => setNewLoan({...newLoan, type: e.target.value})}>
                        <option>할부</option><option>리스</option><option>담보대출</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">대출 원금 (원)</label>
                      <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="0" value={newLoan.total_amount} onChange={e => setNewLoan({...newLoan, total_amount: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">월 납입금 (원)</label>
                      <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="0" value={newLoan.monthly_payment} onChange={e => setNewLoan({...newLoan, monthly_payment: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">매월 납입일 (일)</label>
                      <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="예: 25" value={newLoan.payment_date} onChange={e => setNewLoan({...newLoan, payment_date: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">만기일</label>
                      <input type="date" className="w-full border rounded-lg p-2 text-sm" value={newLoan.end_date} onChange={e => setNewLoan({...newLoan, end_date: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={handleAddLoan} className="w-full bg-steel-600 text-white py-3 rounded-xl font-bold hover:bg-steel-700 transition-colors">등록하기</button>
                </div>

                {/* 2. 목록 리스트 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">📋 등록된 금융 리스트 ({loans.length})</h3>
                  {loadingLoans ? <p className="text-center py-10 text-gray-400">로딩 중...</p> : (
                    loans.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">등록된 금융 정보가 없습니다.</div>
                    ) : (
                      loans.map((loan) => (
                        <div key={loan.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-steel-200 transition-all group">
                          <div className="flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-full bg-steel-50 text-steel-600 flex items-center justify-center font-bold text-lg">￦</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800 text-lg">{loan.finance_name}</span>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{loan.type}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                월 <span className="font-bold text-gray-900">{loan.monthly_payment?.toLocaleString()}원</span> (매월 {loan.payment_date}일)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                             <div className="text-right">
                                <p className="text-xs text-gray-400">총 대출금</p>
                                <p className="font-bold text-gray-800">{loan.total_amount?.toLocaleString()}원</p>
                             </div>
                             <button onClick={() => handleDeleteLoan(loan.id)} className="text-gray-300 hover:text-red-500 p-2">🗑️</button>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}