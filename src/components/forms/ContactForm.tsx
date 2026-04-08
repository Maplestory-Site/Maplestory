import { useState } from "react";
import { Button } from "../ui/Button";

type ContactFormProps = {
  topics: string[];
};

export function ContactForm({ topics }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="card contact-card">
      <h3>Get in touch</h3>
      <p>Send a message or email me directly.</p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input name="name" placeholder="Your name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" placeholder="you@email.com" required type="email" />
        </label>
        <label>
          <span>Company</span>
          <input name="company" placeholder="Brand or company" />
        </label>
        <label>
          <span>Inquiry type</span>
          <select defaultValue="">
            <option disabled value="">
              Choose one
            </option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="contact-form__message">
          <span>Message</span>
          <textarea placeholder="Tell me what you need" required rows={6} />
        </label>
        <Button type="submit">Send Message</Button>
        {submitted ? <p className="contact-form__success">Message sent. I&apos;ll get back to you soon.</p> : null}
      </form>
    </div>
  );
}
