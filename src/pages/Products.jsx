import React from 'react';

import crepeBandage from '../assets/images/crepe-bandage.jpg';
import gauzeCloth from '../assets/images/gauze-cloth.jpg';
import rollBandage from '../assets/images/roll-bandage.jpg';

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
      name: 'Absorbent Gauze Cloth',
      img: gauzeCloth,
      desc: 'Pure cotton, highly absorbent and non-sterile.'
    },
    {
      id: 3,
      name: 'Roll Bandage',
      img: rollBandage,
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