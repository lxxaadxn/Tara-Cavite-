import { useMemo } from 'react';
import { RandomIcon } from './RandomIcon';
function Dots({ active }) {
    // The dots match your Figma: thin rounded bars.
    const dots = [0, 1, 2, 3];
    return (<div className="ft-dots" role="group" aria-label="Carousel progress">
      {dots.map((i) => (<div key={i} className={`ft-dot ${i < active ? 'ft-dot--active' : ''}`} aria-hidden="true"/>))}
    </div>);
}
function StartupFeatureCard({ feature }) {
    return (<article className="ft-startupCard" aria-label={feature.title} role="article">
      <div className="ft-startupCardBg" aria-hidden="true"/>

      <div className="ft-startupCardInner">
        <div className="ft-startupPicture">
          <div className="ft-startupAvatar" role="img" aria-label={`${feature.title} picture`}>
            <RandomIcon className="ft-startupAvatarIcon"/>
          </div>
        </div>

        <div className="ft-startupTitleWrap">
          <h3 className="ft-startupTitle">{feature.title}</h3>
          <p className="ft-startupDesc">{feature.description}</p>
        </div>

        <Dots active={feature.activeDots}/>

        <div className="ft-startupButtonWrap">
          <button type="button" className="ft-primaryBtn" aria-label={`Get started: ${feature.title}`}>
            GET STARTED
          </button>
        </div>
      </div>
    </article>);
}
export function StartupFeatures() {
    const features = useMemo(() => [
        {
            id: 'explore',
            title: 'Explore Destinations',
            description: 'Browse tourist destinations by city and attraction type, with details, photos, and operating hours for easy trip planning.',
            activeDots: 1,
        },
        {
            id: 'map',
            title: 'Map View',
            description: 'View tourist spots on an integrated map and get navigation from your current location.',
            activeDots: 2,
        },
        {
            id: 'plan',
            title: 'Plan & Save',
            description: 'Search and filter destinations by location, category, or popularity, save favorites, and create simple itineraries.',
            activeDots: 3,
        },
        {
            id: 'around',
            title: 'Get Around',
            description: 'Get a transportation guide with jeepneys, buses, and vans, including routes and estimated travel times within the province.',
            activeDots: 3,
        },
    ], []);
    return (<section className="ft-screen ft-startupScreen" aria-label="Startup Features">
      <div className="ft-startupRow" role="region" aria-label="Feature cards">
        {features.map((f) => (<StartupFeatureCard key={f.id} feature={f}/>))}
      </div>
    </section>);
}
