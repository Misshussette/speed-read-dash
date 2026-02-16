import { Link } from 'react-router-dom';
import { Gauge, BarChart3, Download, Filter, Zap, Shield, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  { icon: BarChart3, title: 'Interactive Charts', desc: 'Lap times, sector breakdowns, stint timelines, and driver comparisons — all interactive.' },
  { icon: Filter, title: 'Powerful Filters', desc: 'Filter by track, session, driver, stint, and pit status. Instant updates.' },
  { icon: Download, title: 'Export Anything', desc: 'Download filtered data as CSV or export any chart as a high-res PNG.' },
  { icon: Zap, title: 'Instant Analysis', desc: 'All computation runs client-side. No server, no waiting.' },
  { icon: Shield, title: 'Privacy First', desc: 'Your data never leaves your browser. No upload to any server.' },
];

const About = () => (
  <div className="min-h-screen bg-background dark">
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-8 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Gauge className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">
          Stint<span className="text-primary">Lab</span>
        </h1>
      </div>
      <p className="text-muted-foreground mb-12 text-lg">
        A modern race telemetry analysis tool. Upload your CSV, get insights in seconds.
      </p>

      <h2 className="text-xl font-semibold text-foreground mb-6">Features</h2>
      <div className="grid gap-4 mb-16">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="bg-card/50 border-border/50">
            <CardContent className="flex items-start gap-4 pt-6">
              <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-4">Roadmap</h2>
      <ul className="space-y-2 text-sm text-muted-foreground mb-12">
        <li>• User accounts & cloud storage</li>
        <li>• Team workspaces & sharing</li>
        <li>• Advanced filters (weather, tyre compound)</li>
        <li>• Automated stint strategy recommendations</li>
      </ul>
    </div>
  </div>
);

export default About;
