import Link from 'next/link';
import { noStore, requireAdmin } from '../../lib/adminAuth';
import { PHOTO_BUCKET } from '../../lib/env';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import styles from '../../styles/admin.module.css';

const FIELDS = [
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Country', 'country'],
  ['City', 'city'],
  ['Height', 'height'],
  ['Measurements', 'measurements'],
  ['Shoe size', 'shoe_size'],
  ['Hair colour', 'hair_color'],
  ['Date of birth', 'date_of_birth']
];

export default function AdminEntry({ denied, entry, photoUrls }) {
  if (denied) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <h1>Not available</h1>
          <p>{denied}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <Link href="/admin" className={styles.back}>
          ← All submissions
        </Link>
        <h1>{entry.name}</h1>
        <p className={styles.muted}>Received {new Date(entry.created_at).toLocaleString()}</p>

        <dl className={styles.details}>
          {FIELDS.map(([label, key]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{entry[key] || '—'}</dd>
            </div>
          ))}
          <div>
            <dt>Contact preference</dt>
            <dd>
              {entry.contact_preferences?.length
                ? entry.contact_preferences.join(', ')
                : 'None selected'}
            </dd>
          </div>
        </dl>

        <h2>About</h2>
        <p className={styles.about}>{entry.about || '—'}</p>

        <h2>Photos ({photoUrls.length})</h2>
        {photoUrls.length === 0 ? (
          <p className={styles.muted}>No photos submitted.</p>
        ) : (
          <div className={styles.photos}>
            {photoUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${index + 1}`} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res, query, params }) {
  noStore(res);

  const auth = requireAdmin({ req, res, query });
  if (!auth.ok) {
    res.statusCode = 401;
    return { props: { denied: auth.reason, entry: null, photoUrls: [] } };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    console.error('Could not load submission:', error);
    return { props: { denied: 'Could not load this submission.', entry: null, photoUrls: [] } };
  }
  if (!data) {
    res.statusCode = 404;
    return { props: { denied: 'No submission with that id.', entry: null, photoUrls: [] } };
  }

  // The bucket is private, so every photo needs a short-lived signed URL.
  let photoUrls = [];
  if (data.photo_paths?.length) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(data.photo_paths, 60 * 60);
    if (signError) console.error('Could not sign photo URLs:', signError);
    else photoUrls = signed.filter((item) => item.signedUrl).map((item) => item.signedUrl);
  }

  return {
    props: {
      denied: null,
      entry: { ...data, created_at: data.created_at },
      photoUrls
    }
  };
}
