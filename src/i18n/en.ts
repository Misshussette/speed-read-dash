const en: Record<string, string> = {
  // Landing
  tagline: 'Engineering Your Race Data.',
  upload_drop: 'Drop your CSV here',
  upload_browse: 'or click to browse • semicolon-delimited',
  upload_parsing: 'Parsing...',
  upload_error_csv: 'Please upload a .csv file',
  continue_dashboard: 'Continue to Dashboard',
  feat_upload_title: 'Upload',
  feat_upload_desc: 'Drop your analysis.csv and data is parsed instantly',
  feat_analyze_title: 'Analyze',
  feat_analyze_desc: 'Interactive charts, KPIs, and driver comparisons',
  feat_export_title: 'Export',
  feat_export_desc: 'Download filtered data or charts as PNG',

  // Nav / Header
  export_csv: 'Export CSV',
  new_upload: 'New Upload',

  // Filters
  all_tracks: 'All Tracks',
  all_sessions: 'All Sessions',
  all_cars: 'All Cars',
  all: 'All',
  pit_laps: 'Pit Laps',
  filter_on: 'Included',
  filter_off: 'Excluded',
  filter_label_track: 'Track',
  filter_label_session: 'Session',
  filter_label_car: 'Car',
  filter_label_driver: 'Driver',
  filter_label_stint: 'Stint',
  reset: 'Reset',

  // KPI cards
  kpi_best_lap: 'Best Lap',
  kpi_avg_pace: 'Avg Pace',
  kpi_pace_delta: 'Pace Delta',
  kpi_consistency: 'Consistency',
  kpi_degradation: 'Degradation',
  kpi_total_laps: 'Total Laps',
  kpi_pit_stops: 'Pit Stops',
  kpi_total_pit_time: 'Total Pit Time',

  // Section headers
  section_session_overview: 'Session Overview',
  section_performance_evolution: 'Performance Evolution',
  section_driver_car_analysis: 'Driver & Car Analysis',
  section_operations: 'Operations',

  // Chart titles
  chart_performance_evolution: 'Performance Evolution',
  chart_sector_comparison: 'Sector Comparison',
  chart_driver_comparison: 'Driver Comparison',
  chart_stint_timeline: 'Stint Timeline',
  chart_pit_events: 'Pit Events',

  // Chart labels
  chart_legend_raw: '— thin: raw lap time',
  chart_legend_avg: '— bold: 5-lap rolling avg',
  chart_legend_stint_zone: 'stint zone',
  avg_pace_label: 'Avg Pace',
  pit_in_stint: 'Pit event in stint',

  // Pit table headers
  pit_col_lap: 'Lap',
  pit_col_driver: 'Driver',
  pit_col_type: 'Type',
  pit_col_pit_time: 'Pit Time',
  pit_col_timestamp: 'Timestamp',

  // Insights
  insight_most_consistent: 'Most Consistent Driver',
  insight_highest_variance: 'Highest Variance Sector',
  insight_pace_drop: 'Pace dropped {delta}s over the run — mainly in {sector}.',

  // About
  about_subtitle: 'A modern race telemetry analysis tool. Upload your CSV, get insights in seconds.',
  about_features: 'Features',
  about_feat_charts_title: 'Interactive Charts',
  about_feat_charts_desc: 'Lap times, sector breakdowns, stint timelines, and driver comparisons — all interactive.',
  about_feat_filters_title: 'Powerful Filters',
  about_feat_filters_desc: 'Filter by track, session, driver, stint, and pit status. Instant updates.',
  about_feat_export_title: 'Export Anything',
  about_feat_export_desc: 'Download filtered data as CSV or export any chart as a high-res PNG.',
  about_feat_instant_title: 'Instant Analysis',
  about_feat_instant_desc: 'All computation runs client-side. No server, no waiting.',
  about_feat_privacy_title: 'Privacy First',
  about_feat_privacy_desc: 'Your data never leaves your browser. No upload to any server.',
  about_roadmap: 'Roadmap',
  about_roadmap_accounts: 'User accounts & cloud storage',
  about_roadmap_teams: 'Team workspaces & sharing',
  about_roadmap_filters: 'Advanced filters (weather, tyre compound)',
  about_roadmap_strategy: 'Automated stint strategy recommendations',
  back: 'Back',

  // 404
  not_found_title: '404',
  not_found_text: 'Oops! Page not found',
  not_found_link: 'Return to Home',

  // Chart interaction
  chart_drag_zoom: 'Drag on chart to zoom',
  chart_zoom_reset: 'Reset zoom',

  // KPI help texts
  help_best_lap: 'The fastest single lap recorded in the session, excluding any laps with pit stops.',
  help_avg_pace: 'The average lap time across all clean laps. Shows your typical race pace.',
  help_pace_delta: 'The gap between your average pace and your best lap. A smaller delta means more consistent driving.',
  help_consistency: 'How much your lap times vary. Lower values mean more predictable and repeatable performance.',
  help_degradation: 'The pace difference between your first and last laps. Positive values indicate the car or driver is getting slower over the run.',
  help_total_laps: 'Total number of laps completed in the current filtered selection.',
  help_pit_stops: 'Number of pit stop events recorded during the session.',
  help_total_pit_time: 'Cumulative time spent stationary in the pits across all stops.',

  // Empty state
  no_data: 'No data loaded.',
  upload_csv_btn: 'Upload a CSV',

  // Session manager
  session_manager: 'Session Manager',
  session_add: 'Add Session',
  session_added: 'Session added successfully',
  session_empty: 'No sessions imported yet. Upload a CSV to get started.',
  session_col_date: 'Date',
  session_col_file: 'File',
  session_count: 'sessions',

  // Analysis modes
  mode_overview: 'Overview',
  mode_stints: 'Stints',
  mode_drivers: 'Drivers',
  mode_car: 'Car',
  mode_compare: 'Comparison',
  compare_placeholder: 'Multi-session comparison will be available here. Import multiple sessions and overlay their data.',
};

export default en;
