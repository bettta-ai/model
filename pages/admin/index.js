import Link from 'next/link';
import { noStore, requireAdmin } from '../../lib/adminAuth';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import styles from '../../styles/admin.module.css';

export default function AdminList({ denied, submissions }) {
  if (denied) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <h1>Not authorised</h1>
          <p>{denied}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <h1>Submissions</h1>
        <p className={styles.muted}>{submissions.length} most recent</p>

        {submissions.length === 0 ? (
          <p className={styles.muted}>Nothing submitted yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Received</th>
                <th>Name</th>
                <th>Country</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <Link href={`/admin/${row.id}`}>{row.name}</Link>
                  </td>
                  <td>{row.country}</td>
                  <td>{row.photo_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res, query }) {
  noStore(res);

  const auth = requireAdmin({ req, res, query });
  if (!auth.ok) {
    res.statusCode = 401;
    return { props: { denied: auth.reason, submissions: [] } };
  }

  const { data, error } = await supabaseAdmin()
    .from('submissions')
    .select('id, created_at, name, country, photo_paths')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Could not list submissions:', error);
    return { props: { denied: 'Could not load submissions.', submissions: [] } };
  }

  return {
    props: {
      denied: null,
      submissions: data.map(({ photo_paths: paths, ...row }) => ({
        ...row,
        photo_count: paths?.length || 0
      }))
    }
  };
}
