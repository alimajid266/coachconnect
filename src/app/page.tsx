import Image from "next/image";
import Link from "next/link";
import { coaches, formatCoachPrice } from "@/lib/coaches";

const featuredSports = [
  { number: "01", name: "Cricket", detail: "Batting, bowling and fielding" },
  { number: "02", name: "Football", detail: "Control, passing and movement" },
  { number: "03", name: "Tennis", detail: "Technique and match confidence" },
  { number: "04", name: "Strength", detail: "Power, mobility and conditioning" },
  { number: "05", name: "Swimming", detail: "Confidence, strokes and endurance" },
  { number: "06", name: "Badminton", detail: "Footwork, serves and rallies" },
  { number: "07", name: "Boxing", detail: "Safe fundamentals and fitness" },
  { number: "08", name: "Yoga", detail: "Balance, mobility and recovery" },
];

export default function HomePage() {
  const featuredCoaches = coaches.slice(0, 3);

  return (
    <div className="revived-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <nav className="container nav" aria-label="Main navigation">
          <Link className="brand" href="/" aria-label="CoachConnect home">Coach<span>Connect</span></Link>
          <div className="desktop-nav">
            <Link href="/coaches">Find a Coach</Link>
            <a href="#sports">Sports</a>
            <a href="#how-it-works">How it works</a>
            <Link className="nav-phase" href="/account">Sign in</Link>
          </div>
          <details className="home-mobile-menu">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              <Link href="/coaches">Find a Coach</Link>
              <a href="#sports">Sports</a>
              <a href="#how-it-works">How it works</a>
              <Link href="/account">Sign in</Link>
            </nav>
          </details>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow light">Pakistan&apos;s coaching marketplace</p>
              <h1><span>Train smarter.</span><span className="headline-accent">Play bolder.</span></h1>
              <p className="hero-lead">Explore focused coaching across team sports, racquet sports, fitness, swimming and more—built around your goals.</p>
              <form className="search-console" action="/coaches" method="get" aria-label="Find a coach">
                <div className="search-field search-main">
                  <label htmlFor="home-coach-search">Sport, coach or specialty</label>
                  <input id="home-coach-search" type="search" name="query" placeholder="Try football, swimming or yoga" />
                </div>
                <div className="search-field">
                  <label htmlFor="home-search-city">City</label>
                  <select id="home-search-city" name="city" defaultValue="any">
                    <option value="any">Any city</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Lahore">Lahore</option>
                  </select>
                </div>
                <button className="button button-accent" type="submit">Browse coaches <span aria-hidden="true">→</span></button>
              </form>
              <p className="search-example">Search by sport, coach name, specialty or city.</p>
            </div>
            <div className="hero-stage">
              <div className="hero-orbit" aria-hidden="true" />
              <div className="hero-photo">
                <Image src="/images/hero-training.jpg" alt="Athlete training with a coach" fill priority sizes="(max-width: 980px) 90vw, 42vw" />
              </div>
              <div className="hero-chip hero-chip-top"><span aria-hidden="true">01</span><strong>One-to-one coaching</strong><small>Built around you</small></div>
              <div className="hero-chip hero-chip-bottom"><span className="pulse-dot" /><strong>More ways to train</strong><small>Multiple sports per coach</small></div>
              <div className="hero-wordmark" aria-hidden="true">MOVE</div>
            </div>
          </div>
        </section>

        <section className="momentum-strip" aria-label="CoachConnect marketplace range">
          <div className="container momentum-grid">
            <div><span>Explore widely</span><strong>12 sports</strong></div>
            <p>15 coaches available</p>
            <div className="momentum-promise"><span>One coach, more possibilities</span><strong>Multi-sport profiles →</strong></div>
          </div>
        </section>

        <section className="section categories-section" id="sports" aria-labelledby="sports-heading">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">More ways to move</p><h2 id="sports-heading">Start with a sport</h2></div>
              <p>Browse a broader mix of coaching. Coaches can list every sport they are qualified to teach.</p>
            </div>
            <div className="sport-grid" aria-label="Featured sport categories">
              {featuredSports.map((sport) => (
                <Link className="sport-card" href={`/coaches?query=${encodeURIComponent(sport.name)}`} key={sport.name}>
                  <span>{sport.number}</span><strong>{sport.name}</strong><small>{sport.detail}</small>
                </Link>
              ))}
            </div>
            <div className="home-all-sports"><Link className="button button-primary" href="/coaches">View all 12 sports</Link></div>
          </div>
        </section>

        <section className="section coaches-section" aria-labelledby="featured-heading">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">A quick look</p><h2 id="featured-heading">Featured coaches</h2></div>
              <p>Preview a few profiles here, then use the dedicated catalog to compare everyone.</p>
            </div>
            <div className="coach-grid">
              {featuredCoaches.map((coach) => (
                <article className="coach-card" key={coach.id}>
                  <div className="coach-image-wrap">
                    <Image className="coach-image" src={coach.image} alt={`${coach.sports.join(" and ")} training`} fill sizes="(max-width: 780px) 100vw, 33vw" />
                    <span className="match-badge">{coach.badge}</span>
                  </div>
                  <div className="coach-content">
                    <div className="coach-meta"><span>{coach.location} · {coach.sports.join(" · ")}</span><span>★ {coach.rating}</span></div>
                    <h3>{coach.name}</h3>
                    <p className="specialty">{coach.specialty}</p>
                    <p className="match-reason">{coach.reason}</p>
                    <div className="coach-footer"><div><small>Starting from</small><strong>{formatCoachPrice(coach.price)}</strong></div><Link className="text-button" href={`/coaches?query=${encodeURIComponent(coach.name)}`}>See in catalog</Link></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-heading">
          <div className="container">
            <div className="section-heading compact"><div><p className="eyebrow">Three clear steps</p><h2 id="how-heading">How CoachConnect works</h2></div></div>
            <div className="steps">
              <article><span>01</span><h3>Browse approved coaches</h3><p>Explore every active coach and all the sports they teach.</p></article>
              <article><span>02</span><h3>Choose the right fit</h3><p>Compare experience, style, credentials, price and availability.</p></article>
              <article><span>03</span><h3>Book a session</h3><p>Choose a time that works for you and continue to reserve.</p></article>
            </div>
          </div>
        </section>

        <section className="section trust-section">
          <div className="container trust-panel">
            <div><p className="eyebrow light">Coach standards</p><h2>Know who you&apos;re training with.</h2></div>
            <ul><li>Coach profiles are reviewed before publication.</li><li>Compare sports, experience and credentials.</li><li>Use lesson history and reviews to choose confidently.</li></ul>
          </div>
        </section>

        <section className="section coach-cta">
          <div className="container cta-row"><div><p className="eyebrow">Ready to explore?</p><h2>Find coaching that fits how you move.</h2></div><Link className="button button-primary" href="/coaches">Find a Coach</Link></div>
        </section>
      </main>

      <footer className="footer"><div className="container footer-row"><strong>CoachConnect Pakistan</strong><span>12 sports · 3 cities · Online and in-person</span><span>Find your next coach</span></div></footer>
    </div>
  );
}
