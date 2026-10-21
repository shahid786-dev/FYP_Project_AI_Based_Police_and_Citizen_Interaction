import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext.js';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className={`theme-toggle inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-400 ${compact ? 'p-2.5' : 'px-3 py-2 text-sm font-semibold'}`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
