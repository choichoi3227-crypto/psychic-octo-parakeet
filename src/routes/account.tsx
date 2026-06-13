import '../styles/auth.css';
export function AccountPage() { return <main className="auth-wrap"><form className="auth-card"><h1>자격증명</h1><label className="field">GitHub PAT<input /></label><label className="field">GCP/Blogger API key<input /></label><label className="field">Cloudflare Global API key<input /></label><button className="btn full">검증 후 암호화 저장</button></form></main>; }
