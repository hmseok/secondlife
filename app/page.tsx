'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// 👇 경로 에러 방지용 안전한 import
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // 💻 개발 환경인지 확인 (로컬에서만 true)
  const isLocal = process.env.NODE_ENV === 'development'

  // 폼 상태
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // 회사 정보 (대표 가입용)
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [isFounder, setIsFounder] = useState(true)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

  // 뷰 상태
  const [view, setView] = useState<'login' | 'signup-select' | 'signup-email' | 'reset-password'>('login')

  const [isMailSent, setIsMailSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isValidPwd, setIsValidPwd] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 1. 이미 로그인 되어 있으면 통과
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace('/admin')
    }
    checkSession()
  }, [])

  // ⚡ [개발자용] 원클릭 로그인 함수
  const handleDevLogin = async () => {
    setLoading(true)
    // 👇 여기에 대표님이 자주 쓰시는 테스트 계정을 적어주세요!
    const devEmail = "sukhomin87@gmail.com"
    const devPassword = "!homin1019"

    const { error } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword
    })

    if (error) {
      alert('개발용 계정 로그인 실패! 코드에 적힌 ID/PW를 확인해주세요.')
      setLoading(false)
    } else {
      router.replace('/admin')
    }
  }

  // ... (기존 로직 유지)
  useEffect(() => {
    const verifiedParam = searchParams.get('verified')
    if (verifiedParam === 'true') {
      setMessage({ text: '🎉 인증 완료! 로그인해주세요.', type: 'success' })
      setView('login')
    }
  }, [searchParams])

  const validatePassword = (pwd: string) => /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(pwd);
  useEffect(() => { setIsValidPwd(validatePassword(password)) }, [password])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    let formatted = raw.length > 3 && raw.length <= 7 ? `${raw.slice(0, 3)}-${raw.slice(3)}` :
                    raw.length > 7 ? `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}` : raw;
    setPhone(formatted);
  }

  const translateError = (errorMsg: string) => {
    if (errorMsg.includes('Invalid login credentials')) return '🚨 아이디 또는 비밀번호가 틀렸습니다.';
    if (errorMsg.includes('Email not confirmed')) return '📧 이메일 인증이 필요합니다.';
    if (errorMsg.includes('registered')) return '⚠️ 이미 가입된 이메일입니다.';
    if (errorMsg.includes('등록된 회사가 없습니다')) return '🏢 등록되지 않은 사업자번호입니다.';
    return '오류: ' + errorMsg;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (view === 'signup-email') {
        if (!name || !phone || !businessNumber) return setMessage({ text: '필수 정보를 입력해주세요.', type: 'error' })
        if (isFounder && !companyName) return setMessage({ text: '회사명을 입력해주세요.', type: 'error' })
        if (!isValidPwd) return setMessage({ text: '비밀번호 규칙을 확인해주세요.', type: 'error' })
        if (password !== passwordConfirm) return setMessage({ text: '비밀번호가 일치하지 않습니다.', type: 'error' })
    }

    setLoading(true)

    try {
      if (view === 'signup-email') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: name,
              phone,
              is_founder: isFounder,
              company_name: isFounder ? companyName : null,
              business_number: businessNumber,
            }
          },
        })
        if (error) throw error
        if (data.session) {
             // 자동 로그인 성공 시
            router.replace('/admin');
        } else {
            setIsMailSent(true)
            setMessage({ text: '✅ 인증 메일이 발송되었습니다.', type: 'success' })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/admin');
      }
    } catch (error: any) {
      setMessage({ text: translateError(error.message), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    })
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return setMessage({ text: '이메일을 입력해주세요.', type: 'error' })
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      })
      if (error) throw error
      setMessage({ text: '✅ 재설정 메일 발송 완료!', type: 'success' })
      setIsMailSent(true)
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const resetSignup = () => { setIsMailSent(false); setIsVerified(false); setMessage(null); }

  const EyeIcon = () => (<svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)
  const EyeOffIcon = () => (<svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>)

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans text-gray-900">

      {/* 🖼️ 왼쪽: Sideline 브랜딩 (Sideline으로 교체됨) */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-white">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-90" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/95 via-white/50 to-blue-100/30 z-10"></div>

        <div className="relative z-20 max-w-lg p-12">
          <div className="mb-6">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-200">
              Sideline ERP
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900">
            Work Smart,<br/>
            Play <span className="text-blue-600">Sideline.</span>
          </h1>
          <p className="text-xl text-slate-600 font-medium leading-relaxed">
            복잡한 업무는 사이드라인에 맡기고,<br/>
            비즈니스의 핵심에 집중하세요.
          </p>
        </div>
      </div>

      {/* 📝 오른쪽: 로그인 폼 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* 👇 [핵심] 로컬에서만 보이는 프리패스 버튼 */}
          {isLocal && view === 'login' && (
             <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl animate-bounce-slow">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-yellow-800 uppercase">⚡️ Dev Mode</span>
                </div>
                <button
                  onClick={handleDevLogin}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 rounded-lg text-sm transition-colors shadow-sm"
                >
                  🚀 개발자 계정으로 바로 입장
                </button>
             </div>
          )}

          {/* 헤더 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {view === 'login' && '환영합니다! 👋'}
              {view === 'signup-select' && '새로운 시작 🚀'}
              {view === 'signup-email' && '회원가입'}
              {view === 'reset-password' && '비밀번호 재설정'}
            </h2>
          </div>

          {/* 로그인 뷰 */}
          {view === 'login' && (
             <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border rounded-xl" placeholder="이메일" />
                <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border rounded-xl pr-10" placeholder="비밀번호" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                </div>
                {message && <div className={`p-3 rounded-lg text-sm font-bold ${message.type==='error'?'bg-red-50 text-red-600':'bg-blue-50 text-blue-700'}`}>{message.text}</div>}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all">
                  {loading ? '로그인 중...' : '로그인'}
                </button>
                <div className="mt-8 text-center">
                   <button type="button" onClick={() => setView('signup-select')} className="text-blue-600 font-bold hover:underline">회원가입</button>
                   <span className="mx-3 text-gray-300">|</span>
                   <button type="button" onClick={() => setView('reset-password')} className="text-gray-400 font-bold hover:text-gray-600">비밀번호 찾기</button>
                </div>
             </form>
          )}

          {/* 회원가입 뷰 (라디오 버튼 + Sideline 로직) */}
          {view === 'signup-email' && (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button type="button" onClick={()=>setIsFounder(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isFounder ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>🏢 회사 설립 (대표)</button>
                <button type="button" onClick={()=>setIsFounder(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isFounder ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>👤 직원 합류</button>
              </div>

              <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="이름" />
              <input type="tel" value={phone} onChange={handlePhoneChange} className="w-full px-4 py-3 border rounded-xl" placeholder="연락처" />

              <div className={`p-4 rounded-xl border space-y-3 ${isFounder ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                {isFounder && <input type="text" value={companyName} onChange={e=>setCompanyName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="설립할 회사명" />}
                <input type="text" value={businessNumber} onChange={e=>setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder={isFounder ? "사업자번호 (회사 생성용)" : "입사할 회사 사업자번호"} />
              </div>

              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="이메일" />
              <div className="relative">
                 <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl pr-10" placeholder="비밀번호" />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
              </div>
              <input type="password" value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="비밀번호 확인" />

              {message && <div className={`p-3 rounded-lg text-sm font-bold ${message.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-700'}`}>{message.text}</div>}

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">
                {loading ? '처리 중...' : isFounder ? '가입하기' : '입사 신청'}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm font-bold text-slate-400 mt-2">취소</button>
            </form>
          )}

          {/* 가입 선택 */}
          {view === 'signup-select' && (
            <div className="space-y-3">
              <button onClick={handleGoogleLogin} className="w-full py-3.5 border rounded-xl font-bold text-gray-600 hover:bg-gray-50">Google로 시작</button>
              <button onClick={() => setView('signup-email')} className="w-full py-3.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold hover:bg-blue-100">✉️ 이메일로 시작하기</button>
              <div className="text-center mt-4"><button onClick={() => setView('login')} className="text-sm font-bold text-slate-400 underline">돌아가기</button></div>
            </div>
          )}

          {/* 비번 찾기 */}
          {view === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border rounded-xl" placeholder="가입한 이메일" />
              {message && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold">{message.text}</div>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl">링크 보내기</button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm font-bold text-slate-400">취소</button>
            </form>
          )}

          <div className="mt-12 text-center">
            <p className="text-xs text-slate-300 font-bold">© 2026 Sideline ERP. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}