import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { SHA256 } from 'crypto-js'
import jwt_decode from 'jwt-decode'
import moment from 'moment';

import './App.css'

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

  let date = moment(new Date()).format('DD-MM-YYYY');

  const getOtp = () => {
    if (timer) {
      clearTimeout(timer)
    }
    setOtp('');
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
      setTimeout(() => {
        getOtp()
      }, 900000);
    })
  }

  const getSlots = () => {
    axios.get(cowinUrl + `/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`)
    .then((res: any) => {
      let centers = res.data.centers;
      centers.forEach((center: any) => {
        if (!blacklistCenters.includes(center.center_id)) {
            center.sessions.forEach((session: any) => {
                if (session.min_age_limit === 18) {
                    if (session.available_capacity > 0) {
                      bookSlot({ session, center })
                      setSlotsArray([...slotsArray, { center, session }]);
                    }
                }
            })
        }
    });
    })
  }

  const isTokenExpired = (token: any) => {
    let decodedToken: any = jwt_decode(token)
    var dateNow = new Date();
    return decodedToken.exp > dateNow.getTime()/1000;
  }

  const bookSlot = (slot: any) => {
    if (isTokenExpired(token)) {
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
    }, 20000)
    return () => {
      clearInterval(otpInterval)
      clearInterval(slotsInterval)
    }
  }, [getSlots])

  return (
    <div className="">
      <div className='otp-section'>
        <input type="number" value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} />
        <button onClick={getOtp}>Get OTP</button>
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
