import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode.react';
import EventNFT from './contracts/EventNFT.json'; // ABI of the deployed contract

const CONTRACT_ADDRESS = "0x52aaeeb1ac34415b434ba7101a5ce34fdd1045ea";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [activeTokens, setActiveTokens] = useState([]); // Store active tokens

  // Initialize ethers provider and contract
  useEffect(() => {
    const initEthers = async () => {
      if (window.ethereum) {
        const webProvider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = await webProvider.getSigner();
        setProvider(webProvider);
        setSigner(signer);
        const accountAddress = await signer.getAddress();
        setAccount(accountAddress);
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, EventNFT.abi, signer);
        setContract(contract);

        // Check if the connected user is the organizer
        const organizerRole = await contract.hasRole(
          ethers.keccak256(ethers.toUtf8Bytes("ORGANIZER_ROLE")),
          accountAddress
        );
        setIsOrganizer(organizerRole);

        // Fetch active tokens for the user
        await fetchUserTokenURIs(accountAddress, contract);
      } else {
        alert("MetaMask not detected");
      }
    };
    initEthers();
  }, []);

  // Fetch tokens owned by the user
  const fetchUserTokenURIs = async (userAddress, contract) => {
    try {
      const uris = await contract.getTokenURIsForOwner(userAddress);
      setActiveTokens(uris); // Update the state with the token URIs
    } catch (err) {
      console.error("Error fetching user's token URIs:", err);
    }
  };
  
  

  // Mint a new NFT
  const mintNFT = async () => {
    if (contract && tokenId && metadataURI) {
      try {
        const tx = await contract.mintNFT(account, tokenId, `ipfs://${metadataURI}`);
        await tx.wait();
        alert(`NFT Minted with Token ID: ${tokenId}`);
        // Fetch active tokens again after minting
        await fetchUserTokenURIs(account, contract);
      } catch (err) {
        console.error("Error minting NFT:", err);
      }
    }
  };

  // Fetch metadata for a specific token
  const fetchTokenMetadata = async (id) => {
    if (contract) {
      try {
        const metadata = await contract.tokenURI(id);
        setMetadataURI(metadata); // Display this metadata on the page
      } catch (err) {
        console.error("Error fetching token metadata:", err);
      }
    }
  };
  
  // Update Metadata (Organizer only)
  const updateMetadata = async () => {
    if (contract && isOrganizer && tokenId && metadataURI) {
      try {
        const tx = await contract.updateMetadata(tokenId, `ipfs://${metadataURI}`);
        await tx.wait();
        alert(`Metadata updated for Token ID: ${tokenId}`);
      } catch (err) {
        console.error("Error updating metadata:", err);
      }
    } else {
      alert("Only the organizer can update metadata");
    }
  };

  return (
    <div>
      <h1>Event NFT DApp</h1>
      <p>Connected Account: {account}</p>

      {/* Mint NFT Form */}
      <div>
        <h2>Mint NFT</h2>
        <input
          type="text"
          placeholder="Enter Token ID"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter Metadata (IPFS Hash)"
          value={metadataURI}
          onChange={(e) => setMetadataURI(e.target.value)}
        />
        <button onClick={mintNFT}>Mint NFT</button>
      </div>

      {/* Display QR Code */}
      {tokenId && (
        <div>
          <h2>QR Code for Token #{tokenId}</h2>
          <QRCode value={`https://random-id.ngrok.io/token/${tokenId}`} />
        </div>
      )}

      {/* Display Active Tokens */}
      <div>
        <h2>Active Tickets</h2>
        <ul>
          {activeTokens.map((id) => (
            <li key={id} onClick={() => fetchTokenMetadata(id)}>
              Token ID: {id}
            </li>
          ))}
        </ul>
      </div>

      {/* Show Metadata */}
      {metadataURI && (
        <div>
          <h3>Token Metadata</h3>
          <p>{metadataURI}</p>
        </div>
      )}

      {/* Update Metadata Form (Organizer only) */}
      {isOrganizer && (
        <div>
          <h2>Update Metadata</h2>
          <input
            type="text"
            placeholder="Enter Token ID to Update"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter New Metadata (IPFS Hash)"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
          />
          <button onClick={updateMetadata}>Update Metadata</button>
        </div>
      )}
    </div>
  );
}

export default App;
