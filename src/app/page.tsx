import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import VideoPlaybackToggle from "@/components/video-playback-toggle";

const featuredSports = [
  { number: "01", name: "Cricket", detail: "Batting, bowling and fielding", image: "/images/coach-zainab.jpg", imageAlt: "Cricket stadium" },
  { number: "02", name: "Football", detail: "Control, passing and movement", image: "/images/coach-danish.jpg", imageAlt: "Football training on the pitch" },
  { number: "03", name: "Tennis", detail: "Technique and match confidence", image: "/images/coach-omar.jpg", imageAlt: "Tennis serve practice" },
  { number: "04", name: "Strength", detail: "Power, mobility and conditioning", image: "/images/coach-bilal.jpg", imageAlt: "Strength training with free weights" },
  { number: "05", name: "Swimming", detail: "Confidence, strokes and endurance", image: "/images/coach-farhan.jpg", imageAlt: "Swimmer training in a pool" },
  { number: "06", name: "Badminton", detail: "Footwork, serves and rallies", image: "/images/coach-hira.jpg", imageAlt: "Badminton player jumping for a shot" },
  { number: "07", name: "Boxing", detail: "Safe fundamentals and fitness", image: "/images/coach-mariam.jpg", imageAlt: "Boxing gloves ready for training" },
  { number: "08", name: "Yoga", detail: "Balance, mobility and recovery", image: "/images/coach-rida.jpg", imageAlt: "Yoga balance practice outdoors" },
  { number: "09", name: "Basketball", detail: "Shooting, movement and teamwork", image: "/images/coach-usman.jpg", imageAlt: "Basketball approaching the hoop" },
  { number: "10", name: "Running", detail: "Form, pacing and endurance", image: "/images/coach-nadia.jpg", imageAlt: "Runners training together" },
  { number: "11", name: "Table Tennis", detail: "Serve, spin and fast reactions", image: "/images/coach-iqra.jpg", imageAlt: "Table tennis paddle and ball" },
  { number: "12", name: "Ice Hockey", detail: "Skating, puck control and teamwork", image: "/images/coach-sameer.jpg", imageAlt: "Ice hockey match in progress" },
];

export default function HomePage() {
  return (
    <div className="revived-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="container hero-video-grid">
            <article className="hero-primary-card">
              <video id="american-football-video" aria-label="American football training in motion" autoPlay muted loop playsInline preload="metadata" poster="/images/american-football-training.jpg">
                <source src="/videos/american-football-motion.mp4" type="video/mp4" />
              </video>
              <VideoPlaybackToggle targetId="american-football-video" label="American football training video" />
              <div className="hero-video-overlay">
                <p className="eyebrow light">Pakistan&apos;s coaching marketplace</p>
                <h1><span>Train smarter.</span><span>Play bolder.</span></h1>
                <p className="hero-lead">Focused coaching across team sports, racquet sports, fitness, swimming and more, built around your goals.</p>
                <form className="search-console" action="/coaches" method="get" aria-label="Find a coach">
                  <div className="search-field search-main">
                    <label htmlFor="home-coach-search">Sport, coach or specialty</label>
                    <input id="home-coach-search" type="search" name="query" placeholder="Search for any sport" />
                  </div>
                  <div className="search-field">
                    <label htmlFor="home-search-city">City</label>
                    <select id="home-search-city" name="city" defaultValue="any">
                      <option value="any">Any city</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                    </select>
                  </div>
                  <button className="button button-accent" type="submit">Browse coaches <span aria-hidden="true">→</span></button>
                </form>
                <p className="search-example">Search by sport, coach name, specialty or city.</p>
              </div>
            </article>
            <article className="hero-secondary-card">
              <video id="football-coaching-video" aria-label="Football coaching session in motion" autoPlay muted loop playsInline preload="metadata" poster="/images/coach-danish.jpg">
                <source src="/videos/football-pitch-motion.mp4" type="video/mp4" />
              </video>
              <VideoPlaybackToggle targetId="football-coaching-video" label="football coaching video" />
              <div className="hero-secondary-copy"><span>More ways to move</span><strong>Every sport belongs here.</strong><small>Coaches can add other sports they are qualified to teach.</small></div>
            </article>
          </div>
        </section>

        <section className="momentum-strip" aria-label="CoachConnect marketplace range">
          <div className="container momentum-grid">
            <div><span>Explore widely</span><strong>Any sport, any goal</strong></div>
            <p>Team-reviewed coach profiles</p>
            <div className="momentum-promise"><span>One coach, more possibilities</span><strong>Multi-sport profiles →</strong></div>
          </div>
        </section>

        <section className="section categories-section" id="sports" aria-labelledby="sports-heading">
          <div className="container">
            <div className="section-heading">
              <div><p className="eyebrow">More ways to move</p><h2 id="sports-heading">Start with a sport</h2></div>
              <p>These are popular starting points. Search for any sport, and coaches can add other sports they are qualified to teach.</p>
            </div>
            <div className="sport-grid" aria-label="Featured sport categories">
              {featuredSports.map((sport) => (
                <Link className={`sport-card${sport.image ? " sport-card-photo" : ""}`} href={`/coaches?query=${encodeURIComponent(sport.name)}`} key={sport.name}>
                  {sport.image && <Image src={sport.image} alt={sport.imageAlt ?? ""} fill sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 25vw" />}
                  <span>{sport.number}</span><strong>{sport.name}</strong><small>{sport.detail}</small>
                </Link>
              ))}
            </div>
            <div className="home-all-sports"><Link className="button button-primary" href="/coaches">Explore all coaching</Link></div>
          </div>
        </section>

        <section className="section" id="how-it-works" aria-labelledby="how-heading">
          <div className="container">
            <div className="section-heading compact"><div><p className="eyebrow">Three clear steps</p><h2 id="how-heading">How CoachConnect works</h2></div></div>
            <div className="steps">
              <article><span>01</span><h3>Browse approved coaches</h3><p>Explore every active coach and all the sports they teach.</p></article>
              <article><span>02</span><h3>Choose the right fit</h3><p>Compare experience, style, credentials, price and availability.</p></article>
              <article><span>03</span><h3>Review session details</h3><p>Check pricing, training format and public meeting areas before deciding.</p></article>
            </div>
          </div>
        </section>

        <section className="section trust-section">
          <div className="container trust-panel">
            <div><p className="eyebrow light">Coach standards</p><h2>Know who you&apos;re training with.</h2></div>
            <ul><li>Coach profiles are reviewed before publication.</li><li>Compare sports, experience and credentials.</li><li>Use qualifications and lesson plans to choose confidently.</li></ul>
          </div>
        </section>

        <section className="section coach-cta">
          <div className="container cta-row"><div><p className="eyebrow">Ready to explore?</p><h2>Find coaching that fits how you move.</h2></div><Link className="button button-primary" href="/coaches">Find a Coach</Link></div>
        </section>
      </main>

      <footer className="footer"><div className="container footer-row"><strong>CoachConnect Pakistan</strong><span>Any sport · 4 cities · Online and in-person</span><span>Find your next coach</span></div></footer>
    </div>
  );
}
