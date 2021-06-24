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
import DatePicker, { DatePickerDay, SetFieldValue } from '../../components/DatePicker';
import { format, isAfter, parse } from 'date-fns';
import FormFilterReactSelect from '../../components/FormFilterReactSelect';
import { timezones } from '../Checkouts/_helpers/Timezones';

/* Types */
type WebsiteFormType = {
  claimName: string;
  timezone: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  captcha: boolean;
  active: boolean;
};

const WebsiteForm: FC<RouteComponentProps> = (props) => {
  const claimName = delve(props, 'match.params.claimName');
  const isEdition: boolean = !!claimName;

  /* Date picker */
  const day = 60 * 60 * 24 * 1000;
  const dateFormatter = (day: Date | number) => format(day, 'MM-dd-yyyy');
  const dateFormatterString = (date: string) => {
    const parts = date.split('-');
    return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
  };

  /* State */
  const [website, setWebsite] = useState<Website | null>(null);
  const [websiteClaims, setWebsiteClaims] = useState<WebsiteClaimUrl[]>([]);
  const [claimUrlsListError, setClaimUrlsListError] = useState<string>('');
  const [listInput, setListInput] = useState<string>('');
  const [activeWebsite, setActiveWebsite] = useState<boolean>(true);
  const [activeCaptcha, setActiveCaptcha] = useState<boolean>(false);

  const initialValues = useMemo(() => {
    let values: WebsiteFormType = {
      claimName: '',
      active: true,
      captcha: false,
      start_date: '',
      start_time: '',
      timezone: 0,
      end_date: '',
      end_time: '',
    };

    if (website) {

      const _startDateTime = website.from? website.from.split('T') : null;
      const _startDate = _startDateTime? _startDateTime[0].split('-'): null;
      const _endDateTime = website.to? website.to.split('T') : null;
      const _endDate = _endDateTime? _endDateTime[0].split('-') : null;

      values = {
        claimName: website.claimName,
        timezone: 0,
        start_date: _startDate? `${_startDate[1]}-${_startDate[2]}-${_startDate[0]}` : '',
        start_time: _startDateTime? _startDateTime[1].substr(0, 5) : '',
        end_date: _endDate?`${_endDate[1]}-${_endDate[2]}-${_endDate[0]}` : '',
        end_time: _endDateTime? _endDateTime[1].substr(0, 5) : '',
        active: website.active,
        captcha: website.captcha,
      };
    }
      return values;
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
      setActiveCaptcha(_website.captcha);
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

  const handleDayClick = (day: Date, dayToSetup: DatePickerDay, setFieldValue: SetFieldValue) => {
    setFieldValue(dayToSetup, dateFormatter(day));
  };

  const toggleActiveWebsite = () => setActiveWebsite(!activeWebsite);
  const toggleActiveCaptcha = () => setActiveCaptcha(!activeCaptcha);

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
        start_date,
        start_time,
        end_date,
        end_time,
        timezone,
        captcha,
        active,
      } = submittedValues;

      // Evaluate date consistency
      const _startDateTime = parse(`${start_date} ${start_time}`, 'MM-dd-yyyy HH:mm', new Date());
      const _endDateTime = parse(`${end_date} ${end_time}`, 'MM-dd-yyyy HH:mm', new Date());

      if (isAfter(_startDateTime, _endDateTime)) {
        addToast('Start date & time should be before End date & time', {
          appearance: 'error',
          autoDismiss: true,
        });
        actions.setSubmitting(false);
        return;
      }

      // Format date
      const timezoneSign: string = timezone < 0 ? '-' : '+';
      const absTimezone = Math.abs(timezone);
      const timezoneFilled: string = absTimezone < 10 ? `0${absTimezone}` : `${absTimezone}`;

      const _startDate = format(parse(start_date, 'MM-dd-yyyy', new Date()), 'dd-MMM-yyyy');
      const _endDate = format(parse(end_date, 'MM-dd-yyyy', new Date()), 'dd-MMM-yyyy');

      const formattedStart = `${_startDate} ${start_time}:00${timezoneSign}${timezoneFilled}`;
      const formattedEnd = `${_endDate} ${end_time}:00${timezoneSign}${timezoneFilled}`;

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
            formattedStart,
            formattedEnd,
            captcha,
            active,
          );
        } else {
          await updateWebsite(
            claimName,
            claimUrls,
            formattedStart,
            formattedEnd,
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
          const handleSelectChange = (name: string) => (selectedOption: any) => setFieldValue(name, selectedOption.value);

          let startDateLimit = values.end_date !== '' ? {
                from: new Date(dateFormatterString(values.end_date).getTime() + day),
                to: new Date('2030-01-01'),
              } : undefined;

          let endDateLimit = values.start_date !== '' ? {
                from: new Date('2021-01-01'),
                to: new Date(dateFormatterString(values.start_date).getTime()),
              } : undefined;

          return (
            <Form className={'delivery-admin-form'}>
              <h2>{isEdition ? 'Edit' : 'Create'} Website</h2>

              <div>
                <h3>General Info</h3>
                <div className={'col-xs-12'}>
                  <EventField title="Website Name" name="claimName" />
                </div>
              </div>
              <div className={'date-row'}>

                <div className={'col-xs-4'}>
                    <DatePicker
                      text="Start Date"
                      dayToSetup="start_date"
                      handleDayClick={handleDayClick}
                      setFieldValue={setFieldValue}
                      placeholder={values.start_date}
                      value={values.start_date !== '' ? new Date(values.start_date) : ''}
                      disabled={false}
                      disabledDays={startDateLimit}
                    />
                   <EventField disabled={false} title="" name="start_time" type="time" />
                </div>
                <div className={'col-xs-4'}>
                    <DatePicker
                      text="End Date"
                      dayToSetup="end_date"
                      handleDayClick={handleDayClick}
                      setFieldValue={setFieldValue}
                      placeholder={values.end_date}
                      value={values.end_date !== '' ? new Date(values.end_date) : ''}
                      disabled={false}
                      disabledDays={endDateLimit}
                    />
                    <EventField disabled={false} title="" name="end_time" type="time" />
                </div>
                <div className={'col-xs-4'}>
                  <FormFilterReactSelect
                    label="Timezone"
                    name="timezone"
                    placeholder={''}
                    onChange={handleSelectChange('timezone')}
                    options={timezones}
                    disabled={false}
                    value={timezones?.find((option) => option.value === values['timezone'])}
                  />
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
            <div>

              <div className={'col-xs-8'}>
                <div className={'checkbox-field'} onClick={toggleActiveWebsite}>
                  <input type="checkbox" checked={activeWebsite} readOnly name="website"/>
                  <label>Active Website</label>
                </div>
              </div>

              <div className={'col-xs-4'}>
                <div className={'checkbox-field'} onClick={toggleActiveCaptcha}>
                  <input type="checkbox" checked={activeCaptcha} readOnly  name="captcha" />
                  <label>Captcha Activated</label>
                </div>
              </div>
            </div>

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
