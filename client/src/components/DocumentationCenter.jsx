import { useMemo, useState } from 'react';
import { BookOpen, Boxes, Check, ChevronRight, CircleHelp, Clipboard, Cloud, Copy, Globe2, KeyRound, Mail, Play, Search, Server, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react';
import { useLocale } from '../i18n';
import { PageHeader, Card, Input, EmptyState } from './ui';

function CodeBlock({ value }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1300); };
  return (
    <div className="rounded-[var(--r-lg)] border border-brand-border overflow-hidden bg-brand-bg">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-brand-border/60 bg-brand-surface2">
        <span className="inline-flex items-center gap-1.5 section-title"><TerminalSquare size={13} /> {t('docs.codeExample')}</span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 t-caption text-txt-muted hover:text-txt-primary transition-colors">
          {copied ? <Check size={13} className="text-[rgb(var(--success-fg))]" /> : <Copy size={13} />}{copied ? t('docs.codeCopied') : t('docs.codeCopy')}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] leading-relaxed font-mono text-txt-secondary whitespace-pre">{value}</pre>
    </div>
  );
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

  const sidecards = [
    { icon: Cloud, p: t('docs.sideDeployTitle'), strong: t('docs.sideDeployStrong'), body: t('docs.sideDeployBody') },
    { icon: Workflow, p: t('docs.sideAutomationTitle'), strong: t('docs.sideAutomationStrong'), body: t('docs.sideAutomationBody') },
    { icon: Globe2, p: t('docs.sideDomainTitle'), strong: t('docs.sideDomainStrong'), body: t('docs.sideDomainBody') },
  ];

  return (
    <section className="space-y-6">
      <PageHeader eyebrow={t('docs.heroEyebrow')} icon={BookOpen} title={t('docs.heroTitle')} subtitle={t('docs.heroSubtitle')} actions={(
        <span className="inline-flex items-center gap-2 badge-green"><ShieldCheck size={13} /> {t('docs.heroSignal')}</span>
      )} />

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('docs.searchPlaceholder')} className="pl-9" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(220px,1fr)_2fr] xl:grid-cols-[minmax(240px,1fr)_2.4fr_minmax(200px,1fr)]">
        {/* Library */}
        <aside className="space-y-1 stagger-in" aria-label={t('docs.libraryAria')}>
          <p className="section-title px-1 pb-1">{t('docs.topics')}</p>
          {visibleArticles.map((article) => {
            const ArticleIcon = article.icon;
            const isActive = active.id === article.id;
            return (
              <button key={article.id} onClick={() => setActiveId(article.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-left transition-colors border ${isActive ? 'bg-[rgb(var(--brand)/0.1)] border-[rgb(var(--brand)/0.3)]' : 'border-transparent hover:bg-brand-surface2'}`}>
                <ArticleIcon size={16} className={isActive ? 'text-[rgb(var(--brand))]' : 'text-txt-muted'} />
                <span className="flex-1 min-w-0">
                  <span className="block section-title">{article.category}</span>
                  <span className="block text-sm font-medium text-txt-primary truncate">{article.title}</span>
                </span>
                <ChevronRight size={14} className="text-txt-disabled shrink-0" />
              </button>
            );
          })}
          {!visibleArticles.length && <EmptyState icon={CircleHelp} title={t('docs.noResult')} />}
        </aside>

        {/* Reader */}
        <Card as="article" className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[var(--r-lg)] bg-[rgb(var(--brand)/0.12)] flex items-center justify-center shrink-0"><Icon size={21} className="text-[rgb(var(--brand))]" /></div>
            <div className="min-w-0">
              <p className="section-title">{active.category}</p>
              <h2 className="t-title text-txt-primary mt-0.5">{active.title}</h2>
              <p className="t-body-sm text-txt-muted mt-1">{active.description}</p>
            </div>
          </div>
          <ol className="space-y-3">
            {active.steps.map(([title, text], index) => (
              <li key={title} className="flex gap-3">
                <span className="w-7 h-7 rounded-[var(--r-md)] bg-brand-surface2 border border-brand-border flex items-center justify-center shrink-0 text-[11px] font-semibold font-mono text-txt-muted">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-sm font-semibold text-txt-primary">{title}</h3>
                  <p className="t-body-sm text-txt-secondary mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <CodeBlock value={active.code} />
          <div className="flex items-start gap-2.5 rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 p-3.5">
            <Clipboard size={16} className="text-txt-muted shrink-0 mt-0.5" />
            <p className="t-body-sm text-txt-secondary"><strong className="text-txt-primary">{t('docs.noteLabel')}</strong> {active.note}</p>
          </div>
        </Card>

        {/* Sidecards */}
        <aside className="space-y-3 stagger-in hidden xl:block">
          {sidecards.map((c) => (
            <Card key={c.p} className="p-4">
              <c.icon size={17} className="text-[rgb(var(--brand))]" />
              <p className="section-title mt-2">{c.p}</p>
              <p className="text-sm font-semibold text-txt-primary mt-1">{c.strong}</p>
              <p className="t-body-sm text-txt-muted mt-1">{c.body}</p>
            </Card>
          ))}
        </aside>
      </div>
    </section>
  );
}
