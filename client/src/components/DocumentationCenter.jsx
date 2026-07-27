import { useMemo, useState } from 'react';
import { BookOpen, Boxes, Check, ChevronRight, CircleHelp, Clipboard, Cloud, Copy, Globe2, KeyRound, Mail, Play, Search, Server, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react';
import { useLocale } from '../i18n';

function CodeBlock({ value }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1300); };
  return <div className="docs-code"><div><TerminalSquare size={14} /><span>{t('docs.codeExample')}</span><button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? t('docs.codeCopied') : t('docs.codeCopy')}</button></div><pre>{value}</pre></div>;
}

export default function DocumentationCenter() {
  const { t } = useLocale();
  const [activeId, setActiveId] = useState('start');
  const [query, setQuery] = useState('');

  const articles = useMemo(() => [
    {
      id: 'start', category: t('docs.catStart'), title: t('docs.titleStart'), description: t('docs.descStart'), icon: Play,
      steps: [
        [t('docs.stepStart1Title'), t('docs.stepStart1Body')],
        [t('docs.stepStart2Title'), t('docs.stepStart2Body')],
        [t('docs.stepStart3Title'), t('docs.stepStart3Body')],
        [t('docs.stepStart4Title'), t('docs.stepStart4Body')],
      ],
      code: "POST /api/addresses\n{ \"username\": \"gork_0\", \"domain\": \"mmkgams.space\" }",
      note: t('docs.noteStart'),
    },
    {
      id: 'api', category: t('docs.catApi'), title: t('docs.titleApi'), description: t('docs.descApi'), icon: KeyRound,
      steps: [
        [t('docs.stepApi1Title'), t('docs.stepApi1Body')],
        [t('docs.stepApi2Title'), t('docs.stepApi2Body')],
        [t('docs.stepApi3Title'), t('docs.stepApi3Body')],
        [t('docs.stepApi4Title'), t('docs.stepApi4Body')],
      ],
      code: "export CUSTOM_TEMPMAIL_TOKEN='tm_...'\ncurl -H \"X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN\" \\\n  'https://tempmail.emirhanmamak.com/api/emails/gork_0%40mmkgams.space?after_id=0&wait=25'",
      note: t('docs.noteApi'),
    },
    {
      id: 'mail', category: t('docs.catMail'), title: t('docs.titleMail'), description: t('docs.descMail'), icon: Mail,
      steps: [
        [t('docs.stepMail1Title'), t('docs.stepMail1Body')],
        [t('docs.stepMail2Title'), t('docs.stepMail2Body')],
        [t('docs.stepMail3Title'), t('docs.stepMail3Body')],
        [t('docs.stepMail4Title'), t('docs.stepMail4Body')],
      ],
      code: "GET /api/emails/:address?limit=20&after_id=0&since=2026-07-26T00:00:00Z&wait=25\n\nGET /api/emails/:address/stream",
      note: t('docs.noteMail'),
    },
    {
      id: 'bulk', category: t('docs.catBulk'), title: t('docs.titleBulk'), description: t('docs.descBulk'), icon: Boxes,
      steps: [
        [t('docs.stepBulk1Title'), t('docs.stepBulk1Body')],
        [t('docs.stepBulk2Title'), t('docs.stepBulk2Body')],
        [t('docs.stepBulk3Title'), t('docs.stepBulk3Body')],
        [t('docs.stepBulk4Title'), t('docs.stepBulk4Body')],
      ],
      code: "POST /api/addresses/bulk\n{ \"prefix\": \"gork\", \"domain\": \"mmkgams.space\", \"count\": 25 }",
      note: t('docs.noteBulk'),
    },
    {
      id: 'server', category: t('docs.catServer'), title: t('docs.titleServer'), description: t('docs.descServer'), icon: Server,
      steps: [
        [t('docs.stepServer1Title'), t('docs.stepServer1Body')],
        [t('docs.stepServer2Title'), t('docs.stepServer2Body')],
        [t('docs.stepServer3Title'), t('docs.stepServer3Body')],
        [t('docs.stepServer4Title'), t('docs.stepServer4Body')],
      ],
      code: "npm run verify:db-copy\nnpm run test:otp\nnpm run build\nNODE_ENV=production npm start",
      note: t('docs.noteServer'),
    },
  ], [t]);

  const active = articles.find((article) => article.id === activeId) || articles[0];
  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return articles;
    return articles.filter((article) => `${article.category} ${article.title} ${article.description} ${article.steps.flat().join(' ')} ${article.code}`.toLocaleLowerCase('tr-TR').includes(needle));
  }, [query, articles]);
  const Icon = active.icon;

  return <section className="docs-center">
    <header className="docs-hero">
      <div className="docs-hero-mark"><BookOpen size={25} /><span>MS TEMP MAIL</span></div>
      <div className="docs-hero-copy"><p>{t('docs.heroEyebrow')}</p><h1>{t('docs.heroTitle')}</h1><span>{t('docs.heroSubtitle')}</span></div>
      <div className="docs-hero-signal"><ShieldCheck size={17} /><div><strong>{t('docs.heroSignal')}</strong><small>{t('docs.heroSignalSub')}</small></div></div>
    </header>

    <div className="docs-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('docs.searchPlaceholder')} /><kbd>⌘ K</kbd></div>

    <div className="docs-layout">
      <aside className="docs-library" aria-label={t('docs.libraryAria')}>
        <p>{t('docs.topics')}</p>
        {visibleArticles.map((article) => { const ArticleIcon = article.icon; return <button key={article.id} onClick={() => setActiveId(article.id)} className={active.id === article.id ? 'is-active' : ''}><ArticleIcon size={17} /><span><small>{article.category}</small><strong>{article.title}</strong></span><ChevronRight size={15} /></button>; })}
        {!visibleArticles.length && <div className="docs-no-result"><CircleHelp size={18} />{t('docs.noResult')}</div>}
      </aside>

      <article className="docs-reader">
        <div className="docs-reader-lead"><div className="docs-reader-icon"><Icon size={23} /></div><div><p>{active.category}</p><h2>{active.title}</h2><span>{active.description}</span></div></div>
        <ol className="docs-steps">{active.steps.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
        <CodeBlock value={active.code} />
        <div className="docs-note"><Clipboard size={17} /><p><strong>{t('docs.noteLabel')}</strong>{active.note}</p></div>
      </article>

      <aside className="docs-sidecards"><div><Cloud size={18} /><p>{t('docs.sideDeployTitle')}</p><strong>{t('docs.sideDeployStrong')}</strong><span>{t('docs.sideDeployBody')}</span></div><div><Workflow size={18} /><p>{t('docs.sideAutomationTitle')}</p><strong>{t('docs.sideAutomationStrong')}</strong><span>{t('docs.sideAutomationBody')}</span></div><div><Globe2 size={18} /><p>{t('docs.sideDomainTitle')}</p><strong>{t('docs.sideDomainStrong')}</strong><span>{t('docs.sideDomainBody')}</span></div></aside>
    </div>
  </section>;
}
