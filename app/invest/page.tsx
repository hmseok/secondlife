'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function InvestPage() {
  const [items, setItems] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // 신규 등록 데이터
  const [newItem, setNewItem] = useState({
    car_id: '', investor_name: '', invest_amount: 0,
    share_ratio: 0, payout_cycle: '매월', expected_roi: 0
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: mainData } = await supabase.from('investments').select('*, cars(number, model)').order('created_at', { ascending: false })
    const { data: carData } = await supabase.from('cars').select('id, number, model').order('number', { ascending: true })
    setItems(mainData || [])
    setCars(carData || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!newItem.car_id || !newItem.investor_name) return alert('차량과 투자자명은 필수입니다.')
    const { error } = await supabase.from('investments').insert(newItem)
    if (error) alert('등록 실패: ' + error.message)
    else { alert('투자 정보가 등록되었습니다.'); setShowModal(false); fetchData(); setNewItem({ car_id: '', investor_name: '', invest_amount: 0, share_ratio: 0, payout_cycle: '매월', expected_roi: 0 }) }
  }

  const handleDelete = async (id: number) => {
    if(!confirm('삭제하시겠습니까?')) return
    await supabase.from('investments').delete().eq('id', id)
    fetchData()
  }

  // 합계
  const totalInvest = items.reduce((acc, cur) => acc + (cur.invest_amount || 0), 0)

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">📈 투자/펀딩 관리</h1>
          <p className="text-gray-500 mt-2">차량별 투자 유치 내역과 지분율을 관리합니다.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">+ 투자자 등록</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">총 투자 유치금</p>
          <p className="text-3xl font-black text-blue-900">{totalInvest.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">총 투자자 수</p>
          <p className="text-3xl font-black text-gray-700">{items.length}명</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500">투자 대상 차량</th>
              <th className="p-4 text-xs font-bold text-gray-500">투자자</th>
              <th className="p-4 text-xs font-bold text-gray-500">투자 금액</th>
              <th className="p-4 text-xs font-bold text-gray-500">지분율</th>
              <th className="p-4 text-xs font-bold text-gray-500">정산 주기</th>
              <th className="p-4 text-xs font-bold text-gray-500 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-10 text-center">로딩 중...</td></tr> :
             items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-900">{item.cars?.number}</div>
                  <div className="text-xs text-gray-500">{item.cars?.model}</div>
                </td>
                <td className="p-4 font-bold">{item.investor_name}</td>
                <td className="p-4">{item.invest_amount?.toLocaleString()}원</td>
                <td className="p-4 font-bold text-blue-600">{item.share_ratio}%</td>
                <td className="p-4 text-sm bg-gray-50 rounded"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{item.payout_cycle}</span></td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 text-sm underline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-6">📈 투자자 등록</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">투자 대상 차량</label>
                <select className="w-full border p-3 rounded-xl font-bold" value={newItem.car_id} onChange={e => setNewItem({...newItem, car_id: e.target.value})}>
                  <option value="">차량을 선택하세요</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full border p-3 rounded-xl" placeholder="투자자 이름" value={newItem.investor_name} onChange={e => setNewItem({...newItem, investor_name: e.target.value})} />
                <input className="w-full border p-3 rounded-xl" type="number" placeholder="투자 금액" value={newItem.invest_amount} onChange={e => setNewItem({...newItem, invest_amount: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">지분율 (%)</label>
                   <input type="number" className="w-full border p-3 rounded-xl" value={newItem.share_ratio} onChange={e => setNewItem({...newItem, share_ratio: Number(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">정산 주기</label>
                   <select className="w-full border p-3 rounded-xl" value={newItem.payout_cycle} onChange={e => setNewItem({...newItem, payout_cycle: e.target.value})}>
                      <option>매월</option><option>분기</option><option>년말</option>
                   </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">투자 등록</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}