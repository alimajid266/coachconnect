import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="simple-home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="simple-home-header">
        <Link className="simple-home-brand" href="/">CoachConnect</Link>
        <nav aria-label="Main navigation">
          <Link href="/coaches">Find a Coach</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="/account">Sign in</Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="simple-home-hero">
          <div className="simple-home-copy">
            <p>Pakistan&apos;s coaching marketplace</p>
            <h1>Find the right coach for your next step.</h1>
            <span>Browse approved cricket, tennis and strength coaches across Pakistan.</span>

            <form className="simple-home-search" action="/coaches" method="get" aria-label="Find a coach">
              <label>
                <span>Sport, coach or specialty</span>
                <input type="search" name="query" placeholder="Try tennis or strength" />
              </label>
              <label>
                <span>City</span>
                <select name="city" defaultValue="any">
                  <option value="any">Any city</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                </select>
              </label>
              <button type="submit">Browse coaches</button>
            </form>
          </div>

          <div className="simple-home-image">
            <Image
              src="/images/hero-training.jpg"
              alt="An athlete training with a coach"
              fill
              priority
              sizes="(max-width: 820px) 100vw, 44vw"
            />
          </div>
        </section>

        <section className="simple-home-steps" id="how-it-works" aria-labelledby="simple-how-heading">
          <div className="simple-home-section-heading">
            <p>Simple from the start</p>
            <h2 id="simple-how-heading">How CoachConnect works</h2>
          </div>
          <div>
            <article><span>1</span><h3>Browse approved coaches</h3><p>See every active coach and compare sport, city, format, rating and price.</p></article>
            <article><span>2</span><h3>Choose the right fit</h3><p>Use clear filters and read the important details before deciding.</p></article>
            <article><span>3</span><h3>Reserve safely</h3><p>Sign in when you are ready. Private details stay private.</p></article>
          </div>
        </section>

        <section className="simple-home-trust">
          <div>
            <h2>Built around clear choices.</h2>
            <p>Coach profiles are reviewed before publication. Reviews will require completed CoachConnect bookings.</p>
          </div>
          <Link href="/coaches">Find a Coach</Link>
        </section>
      </main>

      <footer className="simple-home-footer">
        <strong>CoachConnect Pakistan</strong>
        <span>Cricket · Tennis · Strength</span>
      </footer>
    </div>
  );
}
