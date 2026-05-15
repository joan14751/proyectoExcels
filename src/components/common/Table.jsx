export default function Table({ columns, data, children }) {
  return (
    <div className="card p-3">
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
            <tr>
              {columns.map((col, i) => <th key={i}>{col}</th>)}
            </tr>
          </thead>
          <tbody>{children || data?.map(/* render */)}</tbody>
        </table>
      </div>
    </div>
  );
}