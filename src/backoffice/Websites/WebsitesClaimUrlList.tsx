import React, { FC } from 'react';

/* Assets */
import checked from '../../images/checked.svg';
import error from '../../images/error.svg';

/* Types */
import { WebsiteClaimUrl } from '../../api';
import { Link } from 'react-router-dom';
import { ReactComponent as RemoveIcon } from '../../images/close.svg';

type AddressesListProps = {
  websiteClaims: WebsiteClaimUrl[];
};

const WebsitesClaimUrlList: FC<AddressesListProps> = (props) => {
  const { websiteClaims } = props;

  return (
    <div className={'website-claimurl-list'}>
    <div className={'row website-claimurl-list-title'}>
    <div className={'col-xs-4'}>Claim URL</div>
    <div className={'col-xs-2'}>Created</div>
    <div className={'col-xs-2'}>IP</div>
    <div className={'col-xs-2'}>Claimed Time</div>
    <div className={'col-xs-1 center'}>Claimed</div>
    <div className={'col-xs-1 center'}></div>
    </div>
  {websiteClaims.map((websiteClaim, i) => {
    return (
      <div key={websiteClaim.claimUrl} className={`row website-claimurl-list-row  ${i % 2 === 0 ? 'even' : 'odd'}`}>
        <div className={'col-xs-4'}>
      <a href={`${websiteClaim.claimUrl}`} rel="noopener noreferrer" target="_blank">
        {websiteClaim.claimUrl}
      </a>
      </div>
      <div className={'col-xs-2'}>
        {websiteClaim.time}
      </div>
      <div className={'col-xs-2'}>
        {websiteClaim.ip}
      </div>
      <div className={'col-xs-2'}>
        {websiteClaim.claimedTime || "Not claimed"}
      </div>
      <div className={'col-xs-1 center'}>
        <img
          src={websiteClaim.claimed ? checked : error}
          alt={websiteClaim.claimed ? 'Claimed' : 'Pending'}
          className={'status-icon'}
        />
      </div>
      {!websiteClaim.claimed  &&
      <div className={'col-md-1 center event-edit-icon-container'}>
        <Link to={`/admin/websites/${websiteClaim.claimName}`}>
          <RemoveIcon />
        </Link>
      </div>
      }

    </div>
  );
  })}
  </div>
);
};

export default WebsitesClaimUrlList;
