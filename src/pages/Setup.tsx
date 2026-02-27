import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { GitHubService } from '../services/github';
import { encryptData } from '../services/crypto';

export default function Setup({ onSetup }: { onSetup: () => void }) {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('my-notebook-data');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const gh = new GitHubService(token, owner, repo);
      const exists = await gh.checkRepoExists();
      
      if (!exists) {
        try {
          await gh.createRepo();
        } catch (err) {
          throw new Error('无法创建仓库。请检查 Token 是否具有 repo 权限，或者手动创建该私有仓库。');
        }
      }

      // Initialize empty data
      const initialData = { categories: [], records: [] };
      const encrypted = await encryptData(JSON.stringify(initialData), password);
      
      const file = await gh.getFile('data.json');
      if (!file) {
        await gh.saveFile('data.json', encrypted, 'Initial commit');
      }

      localStorage.setItem('gh_token', token);
      localStorage.setItem('gh_owner', owner);
      localStorage.setItem('gh_repo', repo);
      
      onSetup();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || '设置失败，请检查网络或配置');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-stone-900">
          初始化你的笔记本
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          设置 GitHub Token 和主密码以加密保护你的个人记录。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-stone-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-stone-700">GitHub Token (需包含 repo 权限)</label>
              <div className="mt-1">
                <input
                  type="password" required value={token} onChange={e => setToken(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">GitHub 用户名</label>
              <div className="mt-1">
                <input
                  type="text" required value={owner} onChange={e => setOwner(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">仓库名称 (将自动创建为私有)</label>
              <div className="mt-1">
                <input
                  type="text" required value={repo} onChange={e => setRepo(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="border-t border-stone-200 pt-6">
              <label className="block text-sm font-medium text-stone-700">主密码 (用于加密数据，请牢记)</label>
              <div className="mt-1">
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">确认主密码</label>
              <div className="mt-1">
                <input
                  type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="block w-full rounded-lg border border-stone-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit" disabled={loading}
                className="flex w-full justify-center rounded-lg bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? '正在初始化...' : '完成设置'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
