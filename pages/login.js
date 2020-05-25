import Link from 'next/link'
import Layout from './layout'

export default function Login({msg}) {
    return (
        <Layout title='Login'>
            <div className="container vertical-container login-page">
                <div className="card-panel lighten-2 vertical-content">
                    <div className="row">
                        <form className="col s12" method="post">
                            <div className="row">
                                <div className="input-field col s12">
                                    <input id="username" type="text" name="username"
                                        className={msg ? 'invalid' : 'validate'}/>
                                    <label htmlFor="username">Username</label>
                                </div>
                            </div>

                            <div className="row">
                                <div className="input-field col s12">
                                    <input id="password" type="password" name="password"
                                        className={msg ? 'invalid' : 'validate'}/>
                                    <label htmlFor="password">Password</label>
                                    <span className="helper-text center" 
                                        data-error={msg ? msg : ''} data-success=""></span>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col s12 right-align">
                                    <button className="waves-effect waves-light btn" type="submit">Sign In</button>
                                </div>
                            </div>

                        </form>
                    </div>
                    
                    <div className="row">
                        <div className="col s12 center-align">
                            <p>Not registered? <Link href="/register"><a>Register</a></Link></p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .vertical-container {
                    height: 100vh;
                    position: relative;
                }

                .vertical-container .vertical-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translateY(-50%) translateX(-50%);
                }

                .login-page .row {
                    margin-top: 0;
                    margin-bottom: 0;
                }

                .login-page .input-field .helper-text::after {
                    right: 0;
                }
            `}</style>
        </Layout>
    )
}

Login.getInitialProps = async (props) => {
    console.log('Login')
    console.log(props)
    return props.query
};