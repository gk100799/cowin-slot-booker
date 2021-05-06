import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { SHA256 } from 'crypto-js'
import jwt_decode from 'jwt-decode'
import moment from 'moment';

import './App.css'

// const script = () => {
//   document.querySelector('#mat-input-0').value = 7406058845;
//   document.querySelector('#main-content > app-login > ion-content > div > ion-grid > ion-row > ion-col > ion-grid > ion-row > ion-col:nth-child(1) > ion-grid > form > ion-row > ion-col.col-padding.md.hydrated > div > ion-button').click();
//   document.querySelector('#main-content > app-login > ion-content > div > ion-grid > ion-row > ion-col > ion-grid > ion-row > ion-col > ion-grid > form > ion-row > ion-col:nth-child(3) > div > ion-button').addEventListener('click', otpEnteringPage)
//   document.querySelector('#main-content > app-login > ion-content > div > ion-grid > ion-row > ion-col > ion-grid > ion-row > ion-col > ion-grid > form > ion-row > ion-col:nth-child(3) > div > ion-button').click();
// }


const cowinUrl = 'https://cdn-api.co-vin.in/api/v2';

const blacklistCenters = [421758];

const beneficiaries = [46628532688080, 65963559975520]

let timer: any;
let otpInterval: any;
let slotsInterval: any;

function App() {

  const [phoneNumber, setPhoneNumber] = useState('7406058845');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [slotsArray, setSlotsArray] = useState<any>([]);
  const [districtId, setDistrictId] = useState(294);
  const [expiryTime, setExpiryTime] = useState<any>('');

  let date = moment(new Date()).format('DD-MM-YYYY');

  const getOtp = () => {
    if (timer) {
      clearTimeout(timer)
    }
    setOtp('');
    setToken('');
    axios.post(cowinUrl + '/auth/public/generateOTP', {
      mobile: phoneNumber
    }).then((res: any) => {
      setTxnId(res.data.txnId)
    })
    .catch((err: any) => {
      console.log(err)
    })
  }

  const getToken = () => {
    let encryptedOtp = SHA256(otp).toString();
    axios.post(cowinUrl + '/auth/public/confirmOTP', {
      txnId,
      otp: encryptedOtp
    }).then(res => {
      setToken(res.data.token);
      setExpiryTime(moment(new Date()).add(15, 'minutes').format('hh:mm:ss'));
      setTimeout(() => {
        getOtp()
      }, 900000);
    })
  }

  const getSlots = () => {
    axios.get(cowinUrl + `/appointment/sessions/calendarByDistrict?district_id=${districtId}&date=${date}`, {
      headers: {
        // Authoroization: `Bearer ${token}`
      }
    })
    .then((res: any) => {
      let centers = res.data.centers;
      centers.forEach((center: any) => {
        if (!blacklistCenters.includes(center.center_id)) {
            center.sessions.forEach((session: any) => {
                if (session.min_age_limit === 18) {
                    if (session.available_capacity >= 2) {
                      bookSlot({ session, center })
                      setSlotsArray([...slotsArray, { center, session }]);
                    }
                }
            })
        }
    });
    })
  }
  // currently not used
  const isTokenExpired = (token: any) => {
    let decodedToken: any = jwt_decode(token)
    var dateNow = new Date();
    return decodedToken.exp < dateNow.getTime()/1000;
  }

  const bookSlot = (slot: any) => {
    console.log("In bookSlot")
    console.log(!isTokenExpired(token))
    if (token) {
      axios.post(cowinUrl + '/appointment/schedule', {
        dose: '1',
        session_id: slot.session.session_id,
        slot: slot.session.slots[0],
        beneficiaries
      }, {
        headers: {
          Authoroization: `Bearer ${token}`
        }
      }).then(res => {
        try{
          clearInterval(slotsInterval)
          clearInterval(otpInterval)
        } catch(err: any) {
          console.log(err)
        }
        console.log('Success!!')
        console.log(res)
      }).catch(err => console.log(err))
    } else {
      alert('Please Login')
    }
  }

  useEffect(() => {
    // let otpInterval = setInterval(() => {
    //   getOtp()
    // }, 900000)
    slotsInterval = setInterval(() => {
      getSlots()
    }, 4000)
    return () => {
      clearInterval(otpInterval)
      clearInterval(slotsInterval)
    }
  }, [getSlots])

  return (
    <div className="">
      <div className='otp-section'>
        <input type="number" value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} />
        <button onClick={getOtp}>Get OTP</button> (Expiry: {expiryTime})
      </div>
      <div className='otp-section'>
        <input type="number" value={otp} onChange={(e: any) => setOtp(e.target.value)}/>
        <button onClick={getToken}>Get Token</button> (txnId: {txnId || 'none'})
      </div>
      <br/>
      <div style={{width: '70%', wordWrap: 'break-word'}}>Token is: {token || 'none'}</div>
      <br/><br/>

      {slotsArray.map((slotItem: any) => (
        <div>
            {slotItem.center.name} | Available: {slotItem.session.available_capacity} | <button onClick={() => bookSlot(slotItem)}>{slotItem.session.slots[0]}</button>
            <br/>
            <br/>
        </div>
      ))}
    </div>
  );
}

export default App;
