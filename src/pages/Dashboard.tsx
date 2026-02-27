import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Folder, Link as LinkIcon, Key, FileText, Image as ImageIcon, Search, Trash2, Edit2, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { GitHubService } from '../services/github';
import { encryptData } from '../services/crypto';
import { GoogleGenAI } from '@google/genai';

type Category = { id: number; name: string; icon: string };
type RecordItem = { id: number; category_id: number | null; type: string; title: string; content: any; updated_at: string };
type AppData = { categories: Category[]; records: RecordItem[] };

export default function Dashboard() {
  const [data, setData] = useState<AppData>({ categories: [], records: [] });
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const rawData = sessionStorage.getItem('app_data');
    if (!rawData) {
      navigate('/login');
      return;
    }
    setData(JSON.parse(rawData));
  }, [navigate]);

  const saveData = async (newData: AppData) => {
    setIsSyncing(true);
    try {
      setData(newData);
      sessionStorage.setItem('app_data', JSON.stringify(newData));
      
      const token = localStorage.getItem('gh_token')!;
      const owner = localStorage.getItem('gh_owner')!;
      const repo = localStorage.getItem('gh_repo')!;
      const pwd = sessionStorage.getItem('app_pwd')!;
      let sha = sessionStorage.getItem('data_sha') || undefined;

      const gh = new GitHubService(token, owner, repo);
      const encrypted = await encryptData(JSON.stringify(newData), pwd);
      
      const res = await gh.saveFile('data.json', encrypted, 'Update notebook data', sha);
      if (res && res.content && res.content.sha) {
        sessionStorage.setItem('data_sha', res.content.sha);
      }
    } catch (err) {
      console.error('Sync failed', err);
      alert('同步到 GitHub 失败，请检查网络或配置。');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('app_data');
    sessionStorage.removeItem('app_pwd');
    sessionStorage.removeItem('data_sha');
    navigate('/login');
  };

  const deleteRecord = (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    saveData({
      ...data,
      records: data.records.filter(r => r.id !== id)
    });
  };

  const deleteCategory = (id: number) => {
    if (!confirm('确定要删除这个分类吗？该分类下的记录将变为未分类。')) return;
    saveData({
      categories: data.categories.filter(c => c.id !== id),
      records: data.records.map(r => r.category_id === id ? { ...r, category_id: null } : r)
    });
    if (activeCategory === id) setActiveCategory(null);
  };

  const addCategory = (name: string) => {
    if (!name.trim()) return;
    const newCat = { id: Date.now(), name, icon: 'folder' };
    saveData({
      ...data,
      categories: [...data.categories, newCat]
    });
    setIsAddingCategory(false);
  };

  const saveRecord = (record: RecordItem) => {
    if (editingRecord) {
      saveData({
        ...data,
        records: data.records.map(r => r.id === record.id ? record : r)
      });
    } else {
      saveData({
        ...data,
        records: [{ ...record, id: Date.now(), updated_at: new Date().toISOString() }, ...data.records]
      });
    }
    setIsAddingRecord(false);
    setEditingRecord(null);
  };

  const filteredRecords = data.records
    .filter(r => activeCategory === null || r.category_id === activeCategory)
    .filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      JSON.stringify(r.content).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-stone-800">
          <h1 className="text-xl font-bold text-white tracking-tight">我的笔记本</h1>
          {isSyncing && <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />}
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">分类</h2>
          </div>
          <nav className="space-y-1 px-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeCategory === null ? "bg-stone-800 text-white" : "hover:bg-stone-800 hover:text-white"
              )}
            >
              <Folder className="mr-3 h-4 w-4" />
              所有记录
            </button>
            {data.categories.map(cat => (
              <div key={cat.id} className="group flex items-center justify-between">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex-1 flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    activeCategory === cat.id ? "bg-stone-800 text-white" : "hover:bg-stone-800 hover:text-white"
                  )}
                >
                  <Folder className="mr-3 h-4 w-4" />
                  {cat.name}
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </nav>
          
          {isAddingCategory ? (
            <div className="px-4 mt-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addCategory(formData.get('name') as string);
              }}>
                <input 
                  autoFocus
                  name="name"
                  placeholder="分类名称..."
                  className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-stone-500"
                  onBlur={() => setIsAddingCategory(false)}
                />
              </form>
            </div>
          ) : (
            <div className="px-4 mt-4">
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center text-sm text-stone-400 hover:text-white transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                新建分类
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-800">
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm text-stone-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="mr-3 h-4 w-4" />
            锁定笔记本
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="搜索记录..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg leading-5 bg-stone-50 placeholder-stone-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>
          <button
            onClick={() => { setEditingRecord(null); setIsAddingRecord(true); }}
            className="flex items-center justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加记录
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-stone-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map(record => (
              <RecordCard 
                key={record.id} 
                record={record} 
                onEdit={() => { setEditingRecord(record); setIsAddingRecord(true); }}
                onDelete={() => deleteRecord(record.id)}
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-stone-500">
                <Folder className="h-12 w-12 text-stone-300 mb-4" />
                <p>未找到记录。</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {isAddingRecord && (
        <RecordModal 
          record={editingRecord}
          categories={data.categories}
          activeCategory={activeCategory}
          onClose={() => { setIsAddingRecord(false); setEditingRecord(null); }}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}

function RecordCard({ record, onEdit, onDelete }: { record: RecordItem, onEdit: () => void, onDelete: () => void }) {
  const Icon = record.type === 'url' ? LinkIcon : 
               record.type === 'credentials' ? Key : 
               record.type === 'image' ? ImageIcon : FileText;

  const typeLabel = record.type === 'url' ? '书签' : 
                    record.type === 'credentials' ? '账号' : 
                    record.type === 'image' ? '图片' : '文本';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-stone-100 rounded-lg shrink-0">
              <Icon className="h-5 w-5 text-stone-600" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 truncate" title={record.title}>
              {record.title}
            </h3>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1 text-stone-400 hover:text-indigo-600 rounded">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="p-1 text-stone-400 hover:text-red-600 rounded">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-stone-600">
          {record.type === 'url' && (
            <div className="space-y-2">
              <a href={record.content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block">
                {record.content.url}
              </a>
              <p className="line-clamp-3">{record.content.description}</p>
            </div>
          )}
          {record.type === 'credentials' && (
            <div className="space-y-1">
              <p><span className="font-medium">账号:</span> {record.content.username}</p>
              <p><span className="font-medium">密码:</span> ••••••••</p>
              {record.content.url && (
                <a href={record.content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block text-xs mt-2">
                  {record.content.url}
                </a>
              )}
            </div>
          )}
          {record.type === 'text' && (
            <p className="line-clamp-4 whitespace-pre-wrap font-mono text-xs bg-stone-50 p-2 rounded border border-stone-100">
              {record.content.text}
            </p>
          )}
          {record.type === 'image' && (
            <div className="mt-2 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 h-32 flex items-center justify-center">
              {record.content.imageUrl ? (
                <img src={record.content.imageUrl} alt={record.title} className="max-h-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-stone-300" />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 text-xs text-stone-500 flex justify-between shrink-0">
        <span>{new Date(record.updated_at).toLocaleDateString()}</span>
        <span className="uppercase tracking-wider font-semibold">{typeLabel}</span>
      </div>
    </div>
  );
}

function RecordModal({ record, categories, activeCategory, onClose, onSave }: any) {
  const [type, setType] = useState(record?.type || 'url');
  const [title, setTitle] = useState(record?.title || '');
  const [categoryId, setCategoryId] = useState(record?.category_id || activeCategory || '');
  const [content, setContent] = useState<any>(record?.content || {});
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: record?.id,
      category_id: categoryId || null,
      type,
      title,
      content,
      updated_at: new Date().toISOString()
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setContent({ ...content, imageUrl: event.target?.result });
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleSummarize = async () => {
    if (!content.url) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `请用中文简短总结这个网页的内容：${content.url}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      setContent({ ...content, description: response.text });
    } catch (err) {
      console.error(err);
      alert('AI 总结失败，请检查 API Key 或网络。');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-stone-800">{record ? '编辑记录' : '新建记录'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="record-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">类型</label>
                <select 
                  value={type} 
                  onChange={e => { setType(e.target.value); setContent({}); }}
                  disabled={!!record}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="url">书签 / 网址</option>
                  <option value="credentials">账号 / 密码</option>
                  <option value="text">文本笔记</option>
                  <option value="image">图片</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">分类</label>
                <select 
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">未分类</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">标题</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="例如：我的银行账号"
              />
            </div>

            {/* Dynamic Fields based on Type */}
            {type === 'url' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">网址</label>
                  <div className="flex space-x-2">
                    <input 
                      required type="url"
                      value={content.url || ''}
                      onChange={e => setContent({ ...content, url: e.target.value })}
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://..."
                    />
                    <button 
                      type="button"
                      onClick={handleSummarize}
                      disabled={!content.url || isSummarizing}
                      className="inline-flex items-center px-3 py-2 border border-stone-300 shadow-sm text-sm font-medium rounded-lg text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      title="使用 AI 总结网页内容"
                    >
                      <Sparkles className={cn("h-4 w-4 text-indigo-500 mr-2", isSummarizing && "animate-pulse")} />
                      AI 总结
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">描述 / 备注</label>
                  <textarea 
                    value={content.description || ''}
                    onChange={e => setContent({ ...content, description: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}

            {type === 'credentials' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">用户名 / 邮箱</label>
                  <input 
                    required
                    value={content.username || ''}
                    onChange={e => setContent({ ...content, username: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">密码</label>
                  <input 
                    required type="text"
                    value={content.password || ''}
                    onChange={e => setContent({ ...content, password: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">登录网址 (可选)</label>
                  <input 
                    type="url"
                    value={content.url || ''}
                    onChange={e => setContent({ ...content, url: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}

            {type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">内容</label>
                <textarea 
                  required
                  value={content.text || ''}
                  onChange={e => setContent({ ...content, text: e.target.value })}
                  rows={8}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                />
              </div>
            )}

            {type === 'image' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">上传图片</label>
                <input 
                  type="file" accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {content.imageUrl && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-stone-200">
                    <img src={content.imageUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain bg-stone-50" />
                  </div>
                )}
                <p className="mt-2 text-xs text-stone-500">图片将以 Base64 格式加密存储在 GitHub 中，请勿上传过大的图片。</p>
              </div>
            )}
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end space-x-3">
          <button 
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg shadow-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            取消
          </button>
          <button 
            type="submit" form="record-form"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            保存记录
          </button>
        </div>
      </div>
    </div>
  );
}
