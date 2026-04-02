import React from 'react';

const Services = () => {
  return (
    <section id="services" className="py-16 bg-white px-6">
      <h3 className="text-3xl font-semibold text-center mb-10">Our Services</h3>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="border p-6 rounded-lg shadow hover:shadow-lg transition">
          <h4 className="font-bold text-lg mb-2">Web Development</h4>
          <p>Modern, responsive, and scalable web solutions.</p>
        </div>
        <div className="border p-6 rounded-lg shadow hover:shadow-lg transition">
          <h4 className="font-bold text-lg mb-2">Mobile Apps</h4>
          <p>Android and iOS apps with smooth UI/UX.</p>
        </div>
        <div className="border p-6 rounded-lg shadow hover:shadow-lg transition">
          <h4 className="font-bold text-lg mb-2">Cloud & DevOps</h4>
          <p>CI/CD pipelines and cloud architecture solutions.</p>
        </div>
      </div>
    </section>
  );
};

export default Services;
