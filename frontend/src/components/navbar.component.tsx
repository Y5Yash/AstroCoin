

export const Navbar =({walletAddr}: {walletAddr: string})=>{
    return(
        <div className="navbar-class">
           <div className="navbar-coins">
            <div><a href="https://astrocoin.onrender.com">Astrocoin</a></div>
            <div><a href="https://zodiacoin.onrender.com">Zodiacoin</a></div>
           </div>
           <div className="navbar-wallet">
            <div>{walletAddr}</div>
           </div>
        </div>
    )
}