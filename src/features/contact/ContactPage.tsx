import { useSiteSettings } from '../../queries/siteSettings'
import Icon from '../../components/Icon'

export default function ContactPage() {
  const { data: settings } = useSiteSettings()
  const email = settings?.login_contact_email

  return (
    <>
      <h1 className="page-title serif">Contact</h1>
      <div className="page-sub">Get in touch with the Brixton investor relations team.</div>
      <div className="card assist" style={{ alignItems: 'center' }}>
        <div className="assist-l">
          <div className="ic-circle" style={{ width: 44, height: 44, fontSize: 18 }}>
            <Icon name="headset" size={20} />
          </div>
          <div>
            <h4>Investor Relations</h4>
            <p>{email || 'Contact details coming soon.'}</p>
          </div>
        </div>
        {email && (
          <a className="btn-outline" href={`mailto:${email}`}>
            EMAIL US
          </a>
        )}
      </div>
    </>
  )
}
