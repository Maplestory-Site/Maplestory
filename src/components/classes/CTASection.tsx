import { Button } from "../ui/Button";

export function CTASection() {
  return (
    <section className="classes-cta reveal-on-scroll">
      <div>
        <span>Need a faster answer?</span>
        <h2>Watch the class in action.</h2>
        <p>Jump into stream content, builds, and real progression talk.</p>
      </div>
      <div className="classes-cta__actions">
        <Button href="/videos" variant="primary">
          Watch Videos
        </Button>
        <Button href="/community" variant="secondary">
          Join Discord
        </Button>
      </div>
    </section>
  );
}
