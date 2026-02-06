'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// 👇 현재 프로젝트 설정에 맞춰서 수정 (경로 에러 방지)
import { supabase } from '../utils/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 폼 상태
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

  // 뷰 상태: login | signup-select | signup-email | reset-password
  const [view, setView] = useState<'login' | 'signup-select' | 'signup-email' | 'reset-password'>('login')

  const [isMailSent, setIsMailSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isValidPwd, setIsValidPwd] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 1. 이미 로그인 되어 있으면 관리자 페이지로
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/admin')
      }
    }
    checkSession()
  }, [])

  // 2. 이메일 인증 완료 후 돌아왔을 때 처리
  useEffect(() => {
    const verifiedParam = searchParams.get('verified')
    if (verifiedParam === 'true') {
      setMessage({ text: '🎉 인증이 완료되었습니다! 로그인해주세요.', type: 'success' })
      setView('login')
    }
  }, [searchParams])

  // 3. 이메일 인증 대기 중 폴링 (자동 확인)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isMailSent && !isVerified && view === 'signup-email') {
      intervalId = setInterval(async () => {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data.session) {
            setIsVerified(true);
            setMessage({ text: '🎉 인증 확인 완료! [회원가입 완료] 버튼을 눌러주세요.', type: 'success' });
            clearInterval(intervalId);
        }
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [isMailSent, isVerified, email, password, view]);

  const validatePassword = (pwd: string) => /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(pwd);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    let formatted = raw.length > 3 && raw.length <= 7 ? `${raw.slice(0, 3)}-${raw.slice(3)}` :
                    raw.length > 7 ? `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}` : raw;
    setPhone(formatted);
  }

  useEffect(() => { setIsValidPwd(validatePassword(password)) }, [password])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (error: any) {
      setMessage({ text: '구글 로그인 실패: ' + error.message, type: 'error' })
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return setMessage({ text: '가입하신 이메일을 입력해주세요.', type: 'error' })
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      })
      if (error) throw error
      setMessage({ text: '✅ 재설정 메일을 보냈습니다! 메일함을 확인해주세요.', type: 'success' })
      setIsMailSent(true)
    } catch (error: any) {
      setMessage({ text: '메일 전송 실패: ' + error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const translateError = (errorMsg: string) => {
    if (errorMsg.includes('rate limit')) return '🚫 너무 많은 요청입니다. 잠시 후 다시 시도해주세요.';
    if (errorMsg.includes('User already registered')) return '⚠️ 이미 가입된 이메일입니다. 로그인해주세요.';
    if (errorMsg.includes('Email not confirmed')) return '📧 이메일 인증이 필요합니다.';
    if (errorMsg.includes('Invalid login credentials')) return '🚨 아이디 또는 비밀번호가 틀렸습니다.';
    return '오류가 발생했습니다: ' + errorMsg;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (isMailSent && isVerified) {
        setShowWelcome(true);
        setTimeout(() => { router.replace('/admin'); }, 2000);
        return
    }

    if (isMailSent && !isVerified) {
        setMessage({ text: '⏳ 인증을 확인하고 있습니다. 메일의 링크를 클릭해주세요.', type: 'info' })
        return
    }

    if (!email || !password) return setMessage({ text: '이메일과 비밀번호를 입력해주세요.', type: 'error' })

    if (view === 'signup-email') {
        if (!name) return setMessage({ text: '이름을 입력해주세요.', type: 'error' })
        if (!phone) return setMessage({ text: '연락처를 입력해주세요.', type: 'error' })
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
            data: { name, full_name: name, phone }
          },
        })
        if (error) throw error

        if (data.user && data.user.identities?.length === 0) {
            setMessage({ text: '⚠️ 이미 가입된 이메일입니다. 로그인해주세요.', type: 'info' })
            setLoading(false)
            return
        }

        if (data.user && !data.session) {
          setIsMailSent(true)
          setMessage({ text: '✅ 인증 메일이 발송되었습니다! 메일함을 확인해주세요.', type: 'success' })
        } else if (data.session) {
          setMessage({ text: '🎉 가입되었습니다!', type: 'success' })
          setTimeout(() => { router.replace('/admin'); }, 1000)
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

  const resetSignup = () => { setIsMailSent(false); setIsVerified(false); setMessage(null); }

  const GoogleButton = ({ text = "Google로 시작하기" }: { text?: string }) => (
    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group">
       <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
       <span className="font-medium text-gray-600 group-hover:text-gray-900">{text}</span>
    </button>
  )

  const EyeIcon = () => (<svg className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)
  const EyeOffIcon = () => (<svg className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>)

  // 🌈 화면 렌더링
  return (
    <div className="min-h-screen w-full flex bg-gray-50 font-sans text-gray-900">

      {/* 🖼️ 왼쪽: 감성적인 비주얼 영역 (화사하고 심플하게) */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-white">
        {/* 배경 이미지: 밝고 현대적인 건축물/오피스 */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop')" }}
        ></div>
        {/* 그라데이션 오버레이: 텍스트 가독성을 위한 화이트 페이드 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/90 via-white/40 to-blue-50/30 z-10"></div>

        <div className="relative z-20 max-w-lg p-12">
          <div className="mb-6">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-200">
              SecondLife ERP
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900">
            Smart work starts<br/>
            with <span className="text-blue-600">Clarity.</span>
          </h1>
          <p className="text-xl text-slate-600 font-medium leading-relaxed">
            복잡한 자산 관리, 이제 숨 쉬듯 편안하게.<br/>
            세컨드라이프와 함께 비즈니스의 여유를 되찾으세요.
          </p>

          {/* 하단 신뢰 지표 */}
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-900">200+</span>
              <span className="text-sm text-slate-500 font-medium">Enterprise Clients</span>
            </div>
            <div className="h-12 w-px bg-slate-300"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-900">Safe</span>
              <span className="text-sm text-slate-500 font-medium">Bank-level Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📝 오른쪽: 로그인 폼 영역 (심플 & 클린) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">

          {showWelcome ? (
            <div className="text-center py-10">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">반갑습니다, {name || '대표'}님!</h2>
                <p className="text-slate-500 mb-8">성공적으로 로그인되었습니다.</p>
                <div className="inline-flex items-center gap-2 text-blue-600 font-medium bg-blue-50 px-5 py-2.5 rounded-full">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                    대시보드로 이동 중...
                </div>
            </div>
          ) : (
            <>
              {/* 로고 및 헤더 */}
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                  {view === 'login' && '다시 오셨네요! 👋'}
                  {view === 'signup-select' && '새로운 시작 🚀'}
                  {view === 'signup-email' && '정보 입력 ✍️'}
                  {view === 'reset-password' && '비밀번호 재설정 🔒'}
                </h2>
                <p className="text-slate-500">
                  {view === 'login' && '오늘도 생산적인 하루 되세요.'}
                  {view === 'signup-select' && '가장 편한 방법으로 시작해보세요.'}
                  {view === 'signup-email' && '안전한 서비스를 위해 기본 정보를 알려주세요.'}
                  {view === 'reset-password' && '가입한 이메일로 링크를 보내드립니다.'}
                </p>
              </div>

              {/* 회원가입 (이메일 입력 폼) */}
              {view === 'signup-email' && (
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름</label>
                      <input type="text" value={name} onChange={e=>setName(e.target.value)} disabled={isMailSent} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="홍길동" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">연락처</label>
                      <input type="tel" value={phone} onChange={handlePhoneChange} disabled={isMailSent} maxLength={13} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="010-0000-0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={isMailSent} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="name@company.com" />
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} disabled={isMailSent} className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-medium pr-12 ${password && !isValidPwd ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-100'}`} placeholder="8자리 이상 (특수문자 포함)" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 mt-[2px] transform -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                        </div>
                        {password && !isValidPwd && <p className="mt-1 text-xs text-red-500 font-medium">⚠️ 영문, 숫자, 특수문자 포함 8자리 이상</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인</label>
                        <input type={showConfirmPassword ? "text" : "password"} value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} disabled={isMailSent} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="한 번 더 입력" />
                    </div>

                    {message && <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type==='error'?'bg-red-50 text-red-600':message.type==='success'?'bg-green-50 text-green-700':'bg-blue-50 text-blue-700'}`}>{message.text}</div>}

                    <button type="submit" disabled={loading || (isMailSent && !isVerified)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed mt-4">
                      {loading ? '처리 중...' : !isMailSent ? '인증 메일 받기' : isVerified ? '가입 완료하기' : '인증 확인 중...'}
                    </button>

                    <button type="button" onClick={() => {resetSignup(); setView('login')}} className="w-full text-sm font-medium text-slate-400 hover:text-slate-600 mt-4">취소하고 돌아가기</button>
                </form>
              )}

              {/* 비밀번호 재설정 */}
              {view === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">가입한 이메일</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={isMailSent} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="name@company.com" />
                  </div>
                  {message && <div className={`p-3 rounded-lg text-sm font-medium ${message.type==='error'?'bg-red-50 text-red-600':'bg-green-50 text-green-700'}`}>{message.text}</div>}
                  <button type="submit" disabled={loading || isMailSent} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none">{loading ? '전송 중...' : isMailSent ? '전송 완료' : '재설정 링크 보내기'}</button>
                  <button type="button" onClick={() => { setView('login'); setMessage(null); }} className="w-full text-sm font-medium text-slate-400 hover:text-slate-600">돌아가기</button>
                </form>
              )}

              {/* 로그인 화면 */}
              {view === 'login' && (
                <>
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium" placeholder="name@company.com" />
                    </div>
                    <div className="relative">
                        <div className="flex justify-between mb-1.5">
                          <label className="text-sm font-semibold text-slate-700">비밀번호</label>
                          <button type="button" onClick={() => { setView('reset-password'); setMessage(null); setEmail(''); }} className="text-xs font-bold text-blue-600 hover:text-blue-700">비밀번호를 잊으셨나요?</button>
                        </div>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium pr-12" placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                        </div>
                    </div>
                    {message && <div className={`p-3 rounded-lg text-sm font-medium ${message.type==='error'?'bg-red-50 text-red-600':'bg-blue-50 text-blue-700'}`}>{message.text}</div>}

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none">
                      {loading ? '로그인 중...' : '로그인'}
                    </button>
                  </form>

                  <div className="my-8 flex items-center justify-center space-x-4">
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Or continue with</span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>

                  <GoogleButton />

                  <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                      아직 계정이 없으신가요?{' '}
                      <button onClick={() => setView('signup-select')} className="text-blue-600 font-bold hover:underline">회원가입</button>
                    </p>
                  </div>
                </>
              )}

              {/* 가입 방식 선택 */}
              {view === 'signup-select' && (
                <div className="space-y-3">
                  <GoogleButton text="Google 계정으로 시작" />
                  <button onClick={() => setView('signup-email')} className="w-full flex items-center justify-center gap-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all font-medium text-slate-700">
                      <span>✉️</span> 이메일로 시작하기
                  </button>
                  <div className="text-center mt-6">
                    <button onClick={() => setView('login')} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                      이미 계정이 있으신가요? 로그인
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 하단 저작권 표시 */}
          <div className="mt-12 text-center">
            <p className="text-xs text-slate-300 font-medium">
              © 2026 SecondLife ERP. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-blue-600 font-bold">Loading SecondLife...</div>}>
      <LoginForm />
    </Suspense>
  )
}