import { SectionHeading, type Translate } from './landingShared'

/**
 * The objection ("my child won't learn like this"), then the slot the demo
 * keeps for a real exercise from the system.
 */
export function LandingConfidence({ t }: { t: Translate }) {
  return (
    <>
      <section className="confidence-section" aria-labelledby="confidence-title">
        <div className="wrap confidence-inner">
          <h2 id="confidence-title">
            {t('confidence.titleLine1')}
            <br />
            {t('confidence.titleLine2')}
          </h2>
          <p className="confidence-proof">
            {t('confidence.proofLine1')}
            <bdi>Aguy</bdi>
            <br className="confidence-break" /> {t('confidence.proofLine2')}
          </p>
          <div className="confidence-message">
            <p>
              {t('confidence.message')}
              <br />
              <strong>{t('confidence.messageStrong')}</strong>
            </p>
            <p className="confidence-detail">{t('confidence.detail')}</p>
          </div>
        </div>
      </section>

      <section className="system-example wrap" id="example" aria-labelledby="example-title">
        <SectionHeading
          id="example-title"
          title={t('example.title')}
          description={t('example.description')}
        />
        <div className="system-example-mount">
          <span className="example-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="6" y="7" width="36" height="27" rx="4" />
              <path d="M16 41h16M24 34v7M19 16l-5 5 5 5m10-10 5 5-5 5" />
            </svg>
          </span>
          <strong>{t('example.slotTitle')}</strong>
          <p>{t('example.slotText')}</p>
        </div>
      </section>
    </>
  )
}
