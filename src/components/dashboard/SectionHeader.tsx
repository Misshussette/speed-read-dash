const SectionHeader = ({ number, title }: { number: number; title: string }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{number}</span>
    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
    <div className="flex-1 h-px bg-border" />
  </div>
);

export default SectionHeader;
