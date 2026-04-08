import { usePageMeta } from "../app/usePageMeta";
import { ContactForm } from "../components/forms/ContactForm";
import { contactTopics } from "../data/siteContent";

export function ContactPage() {
  usePageMeta("Contact", "Contact SNAILSLAYER for collabs, questions, and channel inquiries.");

  return (
    <>
      <section className="section section--page-start" data-reveal>
        <div className="container contact-page__center">
          <div className="contact-page__form-wrap">
            <ContactForm topics={contactTopics} />
          </div>
        </div>
      </section>
    </>
  );
}
