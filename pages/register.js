import React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Layout from './layout'

const Select = dynamic(
    () => import('react-materialize').then(rm => rm.Select),
    {ssr: false}
)

export default class Register extends React.Component {

    constructor(props) {
        super(props);

        const {errors, data} = props

        this.state = {
            username: data ? data.username : '',
            email: data ? data.email : '',
            password: '',
            confirmPassword: '',
            firstName: data ? data.firstName : '',
            lastName: data ? data.lastName : '',
            sex: data ? data.sex : '',

            errors: errors
        }

        this.handleChange = this.handleChange.bind(this)
    }

    componentDidMount() {
        // M.AutoInit()
    }

    handleChange(event) {
        const name = event.target.name
        this.setState({[name]: event.target.value})
    }

    render() {
        const {username, email, password, confirmPassword, firstName, lastName, sex, errors} = this.state
        return (
            <Layout title='Register'>
    
                <div className="container vertical-container register-page">
                    <div className="card-panel lighten-2 vertical-content">
                        <div className="row">
                            <form className="col s12" method="post">
                                <div className="row">
                                    <div className="input-field col s12">
                                        <input id="username" type="text" name="username"
                                            value={username} onChange={this.handleChange}
                                            className={errors && errors.username ? 'invalid' : ''} />
                                        <label htmlFor="username">Username</label>
                                        <span className="helper-text" 
                                            data-error={errors && errors.username ? errors.username.msg : ''}></span>
                                    </div>
                                </div>
    
                                <div className="row">
                                    <div className="input-field col s12">
                                        <input id="email" type="email" name="email" onChange={this.handleChange}
                                            value={email} className={errors && errors.email ? 'invalid' : ''} />
                                        <label htmlFor="email">Email</label>
                                        <span className="helper-text"
                                            data-error={errors && errors.email ? errors.email.msg : ''}></span>
                                    </div>
                                </div>
    
                                <div className="row">
                                    <div className="input-field col s6">
                                        <input id="password" type="password" name="password" onChange={this.handleChange}
                                            value={password} className={errors && errors.password ? 'invalid' : ''} />
                                        <label htmlFor="password">Password</label>
                                        <span className="helper-text" 
                                            data-error={errors && errors.password ? errors.password.msg : ''}></span>
                                    </div>
                                    <div className="input-field col s6">
                                        <input id="confirmPassword" type="password" onChange={this.handleChange}
                                            value={confirmPassword} className="validate" name="confirmPassword" />
                                        <label htmlFor="confirmPassword">Confirm Password</label>
                                    </div>
                                </div>
    
                                <div className="row">
                                    <div className="input-field col s6">
                                        <input id="first_name" type="text" className="validate" name="firstName" 
                                            value={firstName} onChange={this.handleChange} />
                                        <label htmlFor="first_name">First Name</label>
                                    </div>
                                    <div className="input-field col s6">
                                        <input id="last_name" type="text" className="validate" name="lastName" 
                                            value={lastName} onChange={this.handleChange} />
                                        <label htmlFor="last_name">Last Name</label>
                                    </div>
                                </div>
    
                                <div className="row">
                                    <div className="input-field col s12">
                                        <Select name="sex" label="Sex" value={sex} onChange={this.handleChange}>
                                            <option value="" disabled> 
                                                Choose your option
                                            </option>
                                            <option value="male">
                                                Male
                                            </option>
                                            <option value="female">
                                                Female
                                            </option>
                                        </Select>
                                    </div>
                                </div>
    
                                <div className="row">
                                    <div className="col s12 right-align">
                                        <button className="waves-effect waves-light btn" type="submit">Create</button>
                                    </div>
                                </div>
    
                            </form>
                        </div>
                        <div className="row">
                            <div className="col s12 center-align">
                                <p>Already registered? <Link href="/login"><a>Sign In</a></Link></p>
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
    
                    .register-page .row {
                        margin-top: 0;
                        margin-bottom: 0;
                    }
                `}</style>
            </Layout>
        )
    }
}

Register.getInitialProps = async (props) => {
    console.log('Register')
    console.log(props)
    return props.query
}