import { useState } from 'react';
import { Bug, MessageSquareHeart, Upload, Send, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── Bug Report Form ── */
function BugReportForm() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [context, setContext] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [runRef, setRunRef] = useState('');
  const [env, setEnv] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSending(true);
    try {
      let screenshotUrl: string | null = null;
      if (screenshotFile) {
        const ext = screenshotFile.name.split('.').pop();
        const path = `bug-screenshots/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('setup-media').upload(path, screenshotFile);
        if (!upErr) {
          const { data } = supabase.storage.from('setup-media').getPublicUrl(path);
          screenshotUrl = data.publicUrl;
        }
      }
      const { error } = await supabase.from('beta_bug_reports').insert({
        user_id: user.id,
        context,
        expected_behavior: expected,
        actual_behavior: actual,
        run_reference: runRef || null,
        environment: env || null,
        screenshot_url: screenshotUrl,
      });
      if (error) throw error;
      toast.success(t('fb_bug_sent'));
      setContext(''); setExpected(''); setActual(''); setRunRef(''); setEnv(''); setScreenshotFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bug className="h-4 w-4 text-destructive" />
          {t('fb_bug_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('fb_bug_subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={t('fb_bug_context')}>
          <Textarea value={context} onChange={e => setContext(e.target.value)} className="min-h-[70px] text-sm" />
        </Field>
        <Field label={t('fb_bug_expected')}>
          <Textarea value={expected} onChange={e => setExpected(e.target.value)} className="min-h-[70px] text-sm" />
        </Field>
        <Field label={t('fb_bug_actual')}>
          <Textarea value={actual} onChange={e => setActual(e.target.value)} className="min-h-[70px] text-sm" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('fb_bug_run_ref')}>
            <Input value={runRef} onChange={e => setRunRef(e.target.value)} className="text-sm h-9" placeholder={t('fb_optional')} />
          </Field>
          <Field label={t('fb_bug_env')}>
            <Input value={env} onChange={e => setEnv(e.target.value)} className="text-sm h-9" placeholder="Chrome / iPhone 14…" />
          </Field>
        </div>
        <Field label={t('fb_bug_screenshot')}>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => document.getElementById('bug-screenshot')?.click()}>
              <Upload className="h-3 w-3 mr-1" />{t('fb_choose_file')}
            </Button>
            <input id="bug-screenshot" type="file" accept="image/*" className="hidden"
              onChange={e => setScreenshotFile(e.target.files?.[0] || null)} />
            {screenshotFile && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{screenshotFile.name}</span>}
          </div>
        </Field>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={sending || (!context && !expected && !actual)} size="sm">
            <Send className="h-3.5 w-3.5 mr-1" />{t('fb_send')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Questionnaire ── */
const QUESTION_GROUPS = [
  {
    key: 'profile',
    questions: [
      { key: 'discipline', type: 'radio' as const, options: ['slot', 'rc', 'karting', 'other'] },
      { key: 'experience', type: 'radio' as const, options: ['beginner', 'intermediate', 'advanced', 'expert'] },
      { key: 'existing_tools', type: 'radio' as const, options: ['yes', 'no'] },
    ],
  },
  {
    key: 'first_impression',
    questions: [
      { key: 'clarity', type: 'radio' as const, options: ['very_clear', 'clear', 'confusing', 'very_confusing'] },
      { key: 'understanding_speed', type: 'radio' as const, options: ['immediate', 'few_minutes', 'needed_help', 'still_lost'] },
    ],
  },
  {
    key: 'data_import',
    questions: [
      { key: 'import_ease', type: 'radio' as const, options: ['very_easy', 'easy', 'difficult', 'very_difficult'] },
      { key: 'analysis_success', type: 'radio' as const, options: ['yes', 'partially', 'no', 'not_tried'] },
    ],
  },
  {
    key: 'analysis',
    questions: [
      { key: 'graph_clarity', type: 'radio' as const, options: ['very_clear', 'clear', 'confusing', 'very_confusing'] },
      { key: 'performance_usefulness', type: 'radio' as const, options: ['very_useful', 'useful', 'not_useful', 'unsure'] },
    ],
  },
  {
    key: 'ergonomics',
    questions: [
      { key: 'navigation_ease', type: 'radio' as const, options: ['very_easy', 'easy', 'difficult', 'very_difficult'] },
      { key: 'hard_to_find', type: 'text' as const },
    ],
  },
  {
    key: 'usefulness',
    questions: [
      { key: 'would_use_regularly', type: 'radio' as const, options: ['yes_definitely', 'probably', 'unsure', 'no'] },
      { key: 'why_comment', type: 'text' as const },
    ],
  },
  {
    key: 'missing',
    questions: [
      { key: 'missing_features', type: 'text' as const },
    ],
  },
];

function QuestionnaireForm() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(0);

  const setAnswer = (key: string, value: string) => setAnswers(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('beta_feedback').insert({
        user_id: user.id,
        answers_json: answers,
      });
      if (error) throw error;
      toast.success(t('fb_survey_sent'));
      setAnswers({});
      setCurrentGroup(0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const group = QUESTION_GROUPS[currentGroup];
  const isLast = currentGroup === QUESTION_GROUPS.length - 1;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquareHeart className="h-4 w-4 text-primary" />
          {t('fb_survey_title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('fb_survey_subtitle')}</p>
        {/* Progress */}
        <div className="flex items-center gap-1 mt-2">
          {QUESTION_GROUPS.map((_, i) => (
            <button key={i} onClick={() => setCurrentGroup(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentGroup ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <h3 className="text-sm font-semibold text-foreground">{t(`fb_group_${group.key}`)}</h3>
        {group.questions.map(q => {
          const qKey = `${group.key}_${q.key}`;
          return (
            <div key={qKey} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t(`fb_q_${qKey}`)}</Label>
              {q.type === 'radio' ? (
                <RadioGroup value={answers[qKey] || ''} onValueChange={v => setAnswer(qKey, v)} className="flex flex-wrap gap-2">
                  {q.options!.map(opt => (
                    <div key={opt} className="flex items-center gap-1.5">
                      <RadioGroupItem value={opt} id={`${qKey}_${opt}`} />
                      <Label htmlFor={`${qKey}_${opt}`} className="text-xs cursor-pointer">{t(`fb_opt_${opt}`)}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea value={answers[qKey] || ''} onChange={e => setAnswer(qKey, e.target.value)}
                  className="min-h-[50px] text-sm" placeholder={t('fb_optional')} />
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentGroup(Math.max(0, currentGroup - 1))} disabled={currentGroup === 0}>
            {t('fb_prev')}
          </Button>
          {isLast ? (
            <Button size="sm" onClick={handleSubmit} disabled={sending}>
              <Send className="h-3.5 w-3.5 mr-1" />{t('fb_send')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCurrentGroup(currentGroup + 1)}>
              {t('fb_next')} <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Helper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ── Page ── */
export default function BetaFeedback() {
  const { t } = useI18n();
  return (
    <div className="max-w-[700px] mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('fb_page_title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('fb_page_subtitle')}</p>
      </div>
      <BugReportForm />
      <QuestionnaireForm />
    </div>
  );
}
