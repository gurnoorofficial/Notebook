import Magnetic from "./Magnetic";

const REPO_URL = "https://github.com/gurnoorofficial/Notebook";
const HASH_FOLDER_URL = "https://github.com/gurnoorofficial/Notebook/tree/main/hash";

function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55
        0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7
        1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68
        0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0
        c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67
        .41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.8.55A10.52 10.52 0 0 0 23.5 12
        C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function StepCard({ number, title, children }) {
  return (
    <div className="block-card about-step">
      <span className="about-step-number">{number}</span>

      <div>
        <h3>{title}</h3>
        <p className="muted">{children}</p>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <section className="panel about-panel">
      <style>{`
        .about-panel .crypto-heading {
          max-width: 780px;
        }

        .about-steps {
          display: grid;
          gap: 14px;
          margin: 22px 0 8px;
        }

        .about-step {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .about-step-number {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--hairline);
          border-radius: 10px;
          background: var(--surface-sunken);
          color: var(--ink-dim);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
        }

        .about-step h3 {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
        }

        .about-step p {
          margin: 0;
        }

        .about-step code {
          padding: 1px 6px;
          border-radius: 5px;
          background: var(--surface-sunken);
          border: 1px solid var(--hairline);
          font-family: var(--font-mono);
          font-size: 0.9em;
        }

        .about-step a {
          color: var(--accent-bright);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .about-step a:hover {
          color: var(--accent);
        }

        .about-step a code {
          color: inherit;
        }

        .about-extra-note {
          margin: 22px 0 0;
          padding-top: 22px;
          border-top: 1px solid var(--hairline);
        }

        .about-extra-note strong {
          color: var(--ink);
        }

        .about-github-box {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 26px;
        }

        .about-github-copy h3 {
          margin: 0 0 6px;
          font-size: 16px;
          color: var(--ink);
        }

        .about-github-copy p {
          margin: 0;
          max-width: 520px;
        }

        .about-github-link {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          white-space: nowrap;
          text-decoration: none;
        }

        @media (max-width: 640px) {
          .about-step {
            flex-direction: column;
            gap: 8px;
          }

          .about-github-box {
            flex-direction: column;
            align-items: stretch;
          }

          .about-github-link {
            justify-content: center;
          }
        }
      `}</style>

      <div className="crypto-heading">
        <p className="eyebrow">TRUSTLESS · PROOF LEDGER</p>

        <h2>About Notebook</h2>

        <p className="muted">
          Notebook exists to answer four questions about anything you write, without asking
          anyone to take your word for it: who wrote it, has it been changed since, has any
          entry been quietly removed, and did it really exist as far back as it claims. Every
          answer is checkable with cryptography and math — not trust in this website, this
          server, or any single person.
        </p>
      </div>

      <div className="about-steps">
        <StepCard number="01" title="Ownership — who wrote it">
          You sign each message with your own wallet or Ledger. The signature only verifies
          against your Ethereum address, and only you can produce it — so the person reading it
          can trust it came from you, and you can never credibly deny having written it.
        </StepCard>

        <StepCard number="02" title="Integrity — nothing edited, added, or deleted">
          Every field of a block feeds into its Keccak-256 hash. Change a single character in
          the message, the address, or anything else, and the hash no longer matches — so an
          entry can't be silently altered after the fact.
        </StepCard>

        <StepCard number="03" title="The chain — no page can be torn out">
          Each block also stores the previous block's hash. Remove, reorder, or swap out any
          block — even one in the middle — and every hash after it stops matching, exposing the
          tampering immediately instead of hiding it.
        </StepCard>

        <StepCard number="04" title="Timestamp proof — it existed when it says it did">
          A signature and a hash can't by themselves prove <em>when</em> something was written —
          a server's own clock can always be lied about. So each block's hash is separately
          committed with OpenTimestamps (see the{" "}
          <a href={HASH_FOLDER_URL} target="_blank" rel="noopener noreferrer">
            <code>hash/</code> folder
          </a>{" "}
          on GitHub: a <code>.txt</code> with the hash and its <code>.ots</code> proof),
          independent of Notebook itself. That lets anyone confirm an entry existed at or before
          a given time — without trusting this app's clock, this server, or anyone's claim.
        </StepCard>
      </div>

      <p className="muted about-extra-note">
        Notebook also ships local-only ECIES <strong>Encrypt</strong> and <strong>Decrypt</strong>{" "}
        tools — public keys, messages, private keys and plaintext are processed entirely in your
        browser and never touch the backend. It's a convenience feature, not part of the proof
        system above.
      </p>

      <div className="local-security-box about-github-box">
        <div className="about-github-copy">
          <strong>Open source &amp; verifiable</strong>

          <p>
            Notebook's full source — the backend blockchain rules, the hash canonicalization,
            the signature checks and the frontend — is public on GitHub. Read the code, run it
            yourself, or verify that a block hash in your notebook really was produced the way
            this page claims.
          </p>
        </div>

        <Magnetic strength={8}>
          <a
            className="wallet-button about-github-link"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubGlyph />
            <span>View on GitHub</span>
          </a>
        </Magnetic>
      </div>
    </section>
  );
}
