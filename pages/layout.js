import Head from 'next/head'
import React from 'react'

export default function Layout({title, children}) {
    return (
        <React.Fragment>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
                <title>{title ? title : 'Chat App'}</title>
                {/* <link rel="icon" href="icons/favicon.ico" type="image/x-icon" /> */}
                <link rel="stylesheet" href="css/index.css" />
                <link rel="stylesheet" href="css/chat.css" />
                <link rel="stylesheet" href="materialize/dist/css/materialize.css" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            </Head>
    
            {children}
            
            <script src="materialize/dist/js/materialize.js"></script>
        </React.Fragment>
    )
}
