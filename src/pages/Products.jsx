import React from 'react';

import crepeBandage from '../assets/images/crepe-bandage.jpg';
import gauzeRoll from '../assets/images/gauze-roll.jpg';
import heroBandage from '../assets/images/hero-bandage.jpg';

const Products = () => {

  const productList = [
    {
      id: 1,
      name: 'Cotton Crepe Bandage',
      img: crepeBandage,
      desc: 'High elasticity and comfortable support for joints.'
    },
    {
      id: 2,
      name: 'Absorbent Gauze Roll',
      img: gauzeRoll,
      desc: '100% pure cotton, highly absorbent and sterile.'
    },
    {
      id: 3,
      name: 'Medical Bandage',
      img: heroBandage,
      desc: 'Standard medical grade bandages for daily clinic use.'
    }
  ];


  return (
    <section className="products-section" id="products">

      <div className="container">

        <h2 className="section-title">
          Our Products
        </h2>


        <div className="products-grid">

          {productList.map((product) => (

            <article 
              className="product-card" 
              key={product.id}
            >

              <div className="img-placeholder">

                <img
                  src={product.img}
                  alt={product.name}
                  loading="lazy"
                />

              </div>


              <h3>
                {product.name}
              </h3>


              <p>
                {product.desc}
              </p>


            </article>

          ))}

        </div>

      </div>

    </section>
  );
};


export default Products;