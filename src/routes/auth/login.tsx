import '../../styles/auth.css';
export function LoginPage() { return <main className="auth-wrap"><form className="auth-card"><h1>로그인</h1><label className="field">이메일<input type="email" /></label><label className="field">비밀번호<input type="password" /></label><button className="btn full">로그인</button></form></main>; }
