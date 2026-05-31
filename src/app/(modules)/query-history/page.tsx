export default function QueryHistoryPage() {

  const userQueries = [
    { id: 1, query: 'Find all companies in the logistics industry with more than 100 employees', type: 'structured', resultCount: 120, timestamp: '12/01/2024, 10:30 AM' },
    { id: 2, query: 'Show me the revenue growth of minority-owned businesses in the last year', type: 'ai', resultCount: 45, timestamp: '12/01/2024, 10:30 AM' },
    { id: 3, query: 'List all companies in Texas with employee count between 50 and 200', type: 'structured', resultCount: 80, timestamp: '12/01/2024, 10:30 AM' },
    { id: 4, query: 'What are the top challenges faced by logistics companies in the current market?', type: 'ai', resultCount: 30, timestamp: '12/01/2024, 10:30 AM' },
  ];

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">Query History</h1>
      <p className="text-muted-foreground mt-1">Your last {userQueries.length} searches</p>
      {userQueries.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No queries yet</p>
          <p className="mt-1 text-sm">Run a search to see it here</p>
        </div>
      ) : (
        <div data-tour="query-history-list" className="mt-6 grid gap-4">
          {userQueries.map(q => (
            <div key={q.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{q.query}</p>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{q.type === 'ai' ? '✨ AI' : '🔍 Structured'}</span>
                  <span>{q.resultCount} results</span>
                  <span>{new Date(q.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <button
                data-tour="query-replay-button"
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">Replay</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}