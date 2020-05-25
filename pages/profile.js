import React from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import Layout from './layout'
import styles from './Profile.module.css'

const Modal = dynamic(
    () => import('react-materialize').then(rm => rm.Modal),
    {ssr: false}
)
const Button = dynamic(
    () => import('react-materialize').then(rm => rm.Button),
    {ssr: false}
)

export default class Profile extends React.Component {

    constructor(props){
        super(props)

        const {user} = this.props
        this.state = {
            profilePicture: user.profilePicture,
            sex: user.sex,
            firstName: user.firstName,
            lastName: user.lastName,

            nameEdit: false,
            modalOpen: false
        }
        
        this.imgCropper = React.createRef()
        
        this.inputProfileImg = React.createRef()
        this.rawProfileImg = React.createRef()
    
        this.handleChange = this.handleChange.bind(this)
        this.nameEditable = this.nameEditable.bind(this)
        this.saveName = this.saveName.bind(this)
        this.openProfileImgInput = this.openProfileImgInput.bind(this)
        this.saveProfileImg = this.saveProfileImg.bind(this)
        this.handleImgChange = this.handleImgChange.bind(this)

        this.croppr = null;
    }

    componentDidMount() {
    }

    getCroppedImage(type) {
        const data = this.croppr.getValue(), ctx = this.imgCropper.current.getContext('2d')

        this.imgCropper.current.setAttribute('width', 500)
        this.imgCropper.current.setAttribute('height', 500)

        ctx.drawImage(this.rawProfileImg.current, data.x, data.y, data.width, data.height, 0, 0, 500, 500)

        return this.imgCropper.current.toDataURL(type)
    }

    handleChange(event) {
        this.setState({[event.target.name]: event.target.value})
    }
    
    handleImgChange(event) {
        console.log(event.target.files)
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader(), _this = this;
            reader.onload = function (e) {
                console.log(e.target.result)
                if(_this.croppr) {
                    _this.croppr.setImage(e.target.result)
                }
                else {
                    _this.rawProfileImg.current.src = e.target.result
                    _this.croppr = new Croppr(_this.rawProfileImg.current, {
                        aspectRatio: 1,
                    })
                }
                _this.handleModal(true) // open
            }
            reader.readAsDataURL(event.target.files[0])
        }
    }

    handleModal(open) {
        this.setState({modalOpen: open})
    }

    openProfileImgInput() {
        this.inputProfileImg.current.click()
    }
    saveProfileImg(event) {
        event.preventDefault()
        console.log('data', this.croppr.getValue())
        fetch('/profileImage', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: this.getCroppedImage(this.inputProfileImg.current.files[0].type), // 'image/jpeg'
                name: this.inputProfileImg.current.files[0].name,
                type: this.inputProfileImg.current.files[0].type
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            if(data.success) {
                // profileImg.src = data.imageName
                this.setState({profilePicture: data.imageName})
            }
            this.handleModal(false) // close
        })
        .catch(err => {
            console.log(err)
        })
    }

    nameEditable(event) {
        event.preventDefault()
        this.setState({nameEdit: true})
    }
    saveName(event) {
        event.preventDefault()
        let {firstName , lastName} = this.state
        fetch('/profileName', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName })
        })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            if(data.success) {
                this.setState({
                    firstName: data.firstName, 
                    lastName: data.lastName,
                    nameEdit: false
                })
                // toast
            }
            if(data.error) {

            }
        })
        .catch(err => {
            console.log(err)
        })
    }

    render() {
        const {profilePicture, sex, firstName, lastName, nameEdit, modalOpen} = this.state
        const profileImgSrc = profilePicture != null && profilePicture != '' 
            ? `img/${profilePicture}`
            : `default-img/${sex == 'female' ? 'default-female.png' : 'default.png'}`
        return (
            <Layout title='Profile'>
                <Head>
                    <link rel="stylesheet" href="croppr/croppr.css" />          
                    <script src="croppr/croppr.js"></script>
                </Head>
    
                <div className="container">
                    <div className={`card-panel ${styles['profile-container']}`}>
                        <div className="row">
                            <div className="col s12">
                                <img src={profileImgSrc} onClick={this.openProfileImgInput}
                                    alt="Profile Image" className={`circle responsive-img ${styles['profile-img']}`} />
                                <input type="file" ref={this.inputProfileImg} accept="image/*" onChange={this.handleImgChange}
                                    style={{display: 'none'}} />
                            </div>
                        </div>
    
                        <div className="row">
                            <div className="col s10">
                                <div className={'row info-name' + (nameEdit ? ' hide' : '')}>
                                    <div className="col s12">
                                        <p className="info-name-text center">
                                            {firstName + ' ' + lastName}
                                        </p>
                                    </div>
                                </div>
                                <div className={'row input-name' + (nameEdit ? '' : ' hide')}>
                                    <div className="input-field col s6">
                                        <input id="input-first-name" type="text" className="validate"
                                            value={firstName} onChange={this.handleChange} name="firstName" />
                                        <label htmlFor="input-first-name" className={firstName == '' ? '' : 'active'}>First Name</label>
                                    </div>
                                    <div className="input-field col s6">
                                        <input id="input-last-name" type="text" className="validate" 
                                            value={lastName} onChange={this.handleChange} name="lastName" />
                                        <label htmlFor="input-last-name" className={lastName == '' ? '' : 'active'}>Last Name</label>
                                    </div>
                                </div>
                            </div>
                            <div className="col s2">
                                <a href="#" onClick={this.nameEditable}
                                    className={'btn-floating btn green' + (nameEdit ? ' hide' : '')}>
                                    <i className="material-icons">edit</i>
                                </a>
                                <a href="#" onClick={this.saveName}
                                    className={'btn-floating btn red' + (nameEdit ? '' : ' hide')}>
                                    <i className="material-icons">save</i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
    
                <Modal
                    actions={[
                        <Button onClick={this.saveProfileImg}>
                            Submit
                        </Button>
                    ]}
                    fixedFooter
                    header="Profile Image"
                    open={modalOpen}>
                    <p className={styles['raw-profile-img-container']}>
                        <img alt="Raw Profile Image" ref={this.rawProfileImg} />
                    </p>
                </Modal>
    
                <canvas ref={this.imgCropper} style={{display: 'none'}}></canvas>
            </Layout>
        )
    }
}

Profile.getInitialProps = async (props) => {
    console.log('Profile')
    console.log(props)
    return props.query
};

