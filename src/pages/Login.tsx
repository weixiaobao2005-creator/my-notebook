import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Settings } from 'lucide-react';
import { GitHubService } from '../services/github';
import { decryptData } from '../services/crypto';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('gh_token')!;
      const owner = localStorage.getItem('gh_owner')!;
      const repo = localStorage.getItem('gh_repo')!;
      
      const gh = new GitHubService(token, owner, repo);
      const file = await gh.getFile('data.json');
      
      if (!file) {
        throw new Error('未找到数据文件。');
      }

      try {
        const decrypted = await decryptData(file.content, password);
        // Store decrypted data and password in session storage for the session
        sessionStorage.setItem('app_data', decrypted);
        sessionStorage.setItem('app_pwd', password);
        sessionStorage.setItem('data_sha', file.sha);
        navigate('/');
      } catch (err) {
        throw new Error('密码错误或数据已损坏');
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('确定要清除本地的 GitHub 配置并重新设置吗？')) {
      localStorage.removeItem('gh_token');
      localStorage.removeItem('gh_owner');
      localStorage.removeItem('gh_repo');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-stone-900">
          欢迎回来
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          输入主密码以解锁你的笔记本，数据将从 GitHub 同步。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-stone-100 relative">
          <button onClick={handleReset} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600" title="重新设置配置">
            <Settings className="h-5 w-5" />
          </button>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700">主密码</label>
              <div className="mt-1">
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit" disabled={loading}
                className="flex w-full justify-center rounded-lg bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? '正在解密并同步...' : '解锁'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
