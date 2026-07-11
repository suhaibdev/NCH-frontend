import React from 'react';
import heroBandage from '../assets/images/hero-bandage.jpg';

const Hero = () => {
  return (
    <section
      className="hero"
      id="hero"
      style={{
        backgroundImage: `linear-gradient(rgba(45, 58, 74, 0.7), rgba(45, 58, 74, 0.7)), url(${heroBandage})`,
        backgroundPosition: "center",
        backgroundSize: "cover"
      }}
    >

      <div className="hero-content">

        <h1>
          New Calcutta Handloom
        </h1>

        <p>
          Premium Medical Products, Bandages, and Gauze Cloth.
        </p>

        <a href="#products" className="btn-primary">
          View Products
        </a>

      </div>

    </section>
  );
};

export default Hero;