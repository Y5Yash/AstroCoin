import React, { ChangeEvent, FormEvent, useState } from 'react';
// import logo from './logo.svg';
import './App.css';
import QRCode from 'react-qr-code';
import { Navbar } from './components/navbar.component';

// const reclaim_logo = require('./reclaim.avif');

const App: React.FC = () => {
  const [callbackId, setCallbackId] = useState('');
  const [template, setTemplate] = useState('');
  const [isTemplateOk, setIsTemplateOk] = useState(true);
  const [isProofReceived, setIsProofReceived] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [isAirDropped, setIsAirDropped] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txAddr, setTxAddr] = useState('');
  const [isFetchedMsgClicked, setIsFetchMsgClicked] = useState(false);
  const [walletAddr, setWalletAddr] = useState('Wallet Address: Unknown');
  const [gotErrorTxn, setGotErrorTxn] = useState(false);
  // Update the backendBase according to where it is hosted.
  const backendBase = 'http://192.168.0.130:3000';
  const backendTemplateUrl = `${backendBase}/request-proofs`;
  const backendRefresh = `${backendBase}/isProofVerified`;
  const backendAirDrop = `${backendBase}/sendTransaction`;

  const handleGetTemplate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      console.log(`Requesting ${backendTemplateUrl}`);
      const response = await fetch(backendTemplateUrl);
      if (response.ok) {
        const data = await response.json();
        if (data?.error) {
          console.log(data.error);
          throw new Error(data.error);
        }
        setCallbackId(data.callbackId);
        setTemplate(data.reclaimUrl);
        setIsTemplateOk(true);
        console.log('The template generated is: ', template);
      }
      else {
        setIsTemplateOk(false);
        setTemplate('Error: Unable to receive a valid template from the backend. Check if it is up and running');
      }
    }
    catch (error) {
      setIsTemplateOk(false);
      setTemplate('Error: ' + error);
      console.log(error);
    }
    return;
  };

  const handleRefreshProof = async (e: FormEvent) => {
    e.preventDefault();
    try {
      console.log(`Requesting ${backendRefresh}?id=${callbackId}`);
      const response = await fetch(`${backendRefresh}?id=${callbackId}`);
      if (response.status === 200) {
        const data = await response.json();
        setIsProofReceived(data.success);
      }
    }
    catch (error) {
      setIsProofReceived(false);
      console.log(error);
    }
    setIsFetchMsgClicked(true);
    return;
  };

  const initiateAirDrop = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setGotErrorTxn(false);
      const reqUri = `${backendAirDrop}?id=${callbackId}&toAddress=${receiver}`
      console.log(`Requesting ${reqUri}`)
      const response = await fetch(reqUri);
      const data = await response.json();
      console.log("The data is :", data);
      if (response.status===200) {
        setTxHash(data?.receipt?.hash);
        setTxAddr(data?.receipt?.to);
        setIsAirDropped(true);
        console.log('The receipt is:')
        console.log(data.receipt);
      }
      else {
        console.log(data.msg);
        throw new Error(data.msg);
      }
    }
    catch (error) {
      setIsAirDropped(false);
      console.log(error);
      setGotErrorTxn(true);
    }
    return;
  };

  const handleWalletChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReceiver(e.target.value);
    setWalletAddr(e.target.value);
  };

  return (
    <div className='App'>
      <Navbar walletAddr={walletAddr}/>
      <div className='center-body'>
      <div className='leftside-container'>
      <div className='leftside'>
      <h1>Astrocoin</h1>
      <h2>Get your sun sign's token airdropped today!</h2>
      <br/>
      { !template && !isProofReceived &&
          <button onClick={handleGetTemplate} >Get the proof link/QR</button>
      }

      {template && isTemplateOk && !isProofReceived && <div>
        <div>Scan the QR code or click on it to be redirected.</div>
        <form onSubmit={handleRefreshProof}>
          <button type='submit'>Fetch proof</button>
        </form>
        {isFetchedMsgClicked && <div className='error-txn'>Proof not yet received at the backend. <br/>Wait for the success message on the Reclaim Wallet and retry again. </div>}
      </div>
      }
      {template && !isTemplateOk && !isProofReceived && <div>{template}</div>}
      {isProofReceived && !isAirDropped && <form onSubmit={initiateAirDrop}>
        <label>
          Your Wallet Address:
          <input
            type='text'
            onChange={handleWalletChange}
            required
          />
        </label><br/>
        <button type='submit'>Update Wallet Address</button>
        {gotErrorTxn && <div className='error-txn'>Error in sepolia RPC. Update backend.</div>}
      </form>
      }
      {isAirDropped && <div>
        <h3>Congrats, your account<br/>{receiver}<br/>has been airdropped 1000 Astrocoin.</h3>
        <div>Your Callback Id was {callbackId}</div>
        <div className='large-text'>The Transaction Hash is: {txHash}</div>
        <div>The token contract address is {txAddr}</div>
      </div>
      }
      </div>
      </div>
      {!(template && isTemplateOk && !isProofReceived) && <div className='rightside'></div>}
      {template && isTemplateOk && !isProofReceived && <div className='rightside2'>
        <div className='QR-black'>
          <div className='QR-white'>
            <a href={template} target="_blank" rel="noopener noreferrer" title={template}>
              <QRCode
                size={256}
                value={template}
                fgColor="#000"
                bgColor="#fff"
                className='QR-resize'
              />
            </a>
          </div>
        </div>
      </div>
      }
      </div>
    </div>
  );
}

export default App;
