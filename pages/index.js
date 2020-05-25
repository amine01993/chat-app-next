
export default function Home({name}) {
  return (
    <div>
      Hello { name }
    </div>
  )
}

Home.getInitialProps = async (props) => {
  // console.log(props)
  // const baseURL = req ? `${req.protocol}://${req.get("Host")}` : "";
  // const res = await fetch(`${baseURL}/api/thoughts`);
  // return {
  //   thoughts: await res.json()
  // };
  return {
    name: props.query.name
  }
};