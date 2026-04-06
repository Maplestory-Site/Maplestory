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
      <h3>Contact email</h3>
      <p>Use the form below or send an email to get in touch.</p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input name="name" placeholder="Your name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" placeholder="you@company.com" required type="email" />
        </label>
        <label>
          <span>Company</span>
          <input name="company" placeholder="Brand or company" />
        </label>
        <label>
          <span>Inquiry type</span>
          <select defaultValue="">
            <option disabled value="">
              Select inquiry type
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
          <textarea placeholder="Tell me a little about the opportunity" required rows={6} />
        </label>
        <Button type="submit">Send Inquiry</Button>
        {submitted ? <p className="contact-form__success">Your message has been sent. I'll get back to you when I can.</p> : null}
      </form>
    </div>
  );
}
