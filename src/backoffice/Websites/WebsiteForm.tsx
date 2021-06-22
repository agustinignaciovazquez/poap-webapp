import React, { FC, useState, useEffect, useMemo } from 'react';
import { useHistory, RouteComponentProps } from 'react-router-dom';
import { useToasts } from 'react-toast-notifications';
import { Formik, Form, FormikActions } from 'formik';
import delve from 'dlv';

/* Helpers */
import { ROUTES } from 'lib/constants';
import { WebsiteSchema } from '../../lib/schemas';
import { Website, getWebsite, getWebsiteClaimUrls, WebsiteClaimUrl, createWebsite, updateWebsite,
} from '../../api';

/* Components */
import { SubmitButton } from '../../components/SubmitButton';
import { EventField } from '../EventsPage';
import { Loading } from '../../components/Loading';
import WebsitesClaimUrlList from './WebsitesClaimUrlList';

/* Types */
type WebsiteFormType = {
  claimName: string;
  from?: string;
  to?: string;
  captcha: boolean;
  active: boolean;
};

const WebsiteForm: FC<RouteComponentProps> = (props) => {
  const claimName = delve(props, 'match.params.claimName');
  const isEdition: boolean = !!claimName;

  /* State */
  const [website, setWebsite] = useState<Website | null>(null);
  const [websiteClaims, setWebsiteClaims] = useState<WebsiteClaimUrl[]>([]);
  const [claimUrlsListError, setClaimUrlsListError] = useState<string>('');
  const [listInput, setListInput] = useState<string>('');
  const [activeWebsite, setActiveWebsite] = useState<boolean>(true);

  const initialValues = useMemo(() => {
    if (website) {
      const values: Website = {
        claimName: website.claimName,
        created: website.created,
        from: website.from,
        to: website.to,
        active: website.active,
        captcha: website.captcha,
      };
      return values;
    } else {
      const values: WebsiteFormType = {
        claimName: '',
        active: true,
        captcha: false,
        from: undefined,
        to: undefined
      };
      return values;
    }
  }, [website]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Libraries */
  const { addToast } = useToasts();
  const history = useHistory();

  /* Effects */
  useEffect(() => {
    if (isEdition) {
      fetchWebsite();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Data functions */
  const fetchWebsite = async () => {
    try {
      const _website = await getWebsite(claimName);
      setWebsite(_website);
      setActiveWebsite(_website.active);
      const _claimUrls = await getWebsiteClaimUrls(claimName);
      setWebsiteClaims(_claimUrls);
    } catch (e) {
      addToast('Error while fetching delivery', {
        appearance: 'error',
        autoDismiss: false,
      });
    }
  };


  /* UI Manipulation */
  const handleListChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
    setListInput(ev.target.value);
  };
  const toggleActiveWebsite = () => setActiveWebsite(!activeWebsite);

  // Edition Loading Component
  if (isEdition && !website) {
    return (
      <div className={'bk-container'}>
        <h2>Edit Website</h2>
        <Loading />
      </div>
    );
  }
  //Submit form
  const onSubmit = async (submittedValues: WebsiteFormType, actions: FormikActions<WebsiteFormType>) => {
    try {
      if (!listInput && !isEdition) {
        setClaimUrlsListError('A claim urls list is required');
        actions.setSubmitting(false);
        return;
      }
      setClaimUrlsListError('');

      const {
        claimName,
        from,
        to,
        captcha,
        active,
      } = submittedValues;

      // Clean claimUrls
      const claimUrls = [];
      try {
        const _claimUrl = listInput.split(/\n/);
        for (let each of _claimUrl) {
          claimUrls.push(each);
        }
      } catch (e) {
        console.log('Error parsing claimUrls');
        console.log(e);
        setClaimUrlsListError('Unexpected error parsing list');
        actions.setSubmitting(false);
        return;
      }

      try {
        if (!isEdition) {
          await createWebsite(
            claimName,
            claimUrls,
            from,
            to,
            captcha,
            active,
          );
        } else {
          await updateWebsite(
            claimName,
            claimUrls,
            from,
            to,
            captcha,
            active,
          );
        }
        history.push(ROUTES.websites.admin.path);
      } catch (e) {
        let _msg: React.ReactNode | string = e.response.data && e.response.data.message;
        addToast(_msg, {
          appearance: 'error',
          autoDismiss: false,
        });
        actions.setSubmitting(false);
      }
    } catch (err) {
      actions.setSubmitting(false);
      addToast(err.message, {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  }
  return (
    <div className={'bk-container'}>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validateOnBlur={false}
        validateOnChange={false}
        validationSchema={WebsiteSchema}
        onSubmit={onSubmit}
      >
        {({ values, errors, isSubmitting, setFieldValue }) => {

          return (
            <Form className={'delivery-admin-form'}>
              <h2>{isEdition ? 'Edit' : 'Create'} Website</h2>

              <div>
                <h3>General Info</h3>
                <div className={'col-xs-6'}>
                  <EventField title="Event ID:" disabled={true} placeholder={'#'} name="id" />
                </div>
                <div className={'col-xs-6'}>
                  <EventField title="Website Name" name="claimName" />
                </div>
              </div>
              {!isEdition && (
                <div>
                  <h3>Claim Urls List</h3>
                  <div className={'col-xs-12'}>
                    <div className="bk-form-row">
                      <label>List of Claim Urls for the Website</label>
                      <textarea
                        placeholder={``}
                        className={`${claimUrlsListError ? 'error' : ''}`}
                        value={listInput}
                        onChange={handleListChange}
                      />
                      {claimUrlsListError && <p className={'bk-error'}>{claimUrlsListError}</p>}
                    </div>
                  </div>
                </div>
              )}
              {isEdition && (
                <div className={'col-md-12'}>
                  <div className={'checkbox-field'} onClick={toggleActiveWebsite}>
                    <input type="checkbox" checked={activeWebsite} readOnly />
                    <label>Active Website</label>
                  </div>
                </div>
              )}
              <div className={'col-md-12'}>
                <SubmitButton text="Submit" isSubmitting={isSubmitting} canSubmit={true} />
              </div>
              {isEdition && websiteClaims && <WebsitesClaimUrlList websiteClaims={websiteClaims} />}
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default WebsiteForm;
